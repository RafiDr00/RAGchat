import { NextRequest, NextResponse } from 'next/server';
import { loadAllChunks } from '@/lib/storage';
import { generateEmbedding } from '@/lib/embeddings';
import { rankChunks } from '@/lib/vector-math';
import { OpenAI } from 'openai';
import { QueryResponse } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * PRODUCTION: Simple rate limiting map (IP -> timestamp)
 * In production, use Redis for distributed rate limiting
 */
const requestMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestMap.get(ip) || [];

  // Remove old timestamps outside the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recent.length >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  // Add current request
  recent.push(now);
  requestMap.set(ip, recent);

  return true;
}

/**
 * Generate RAG answer from retrieved chunks
 * Concatenates top chunk texts as context
 */
function generateRAGPrompt(chunks: any[], query: string): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.doc} (Match: ${(c.semantic * 100).toFixed(1)}%)\n${c.text.substring(0, 300)}...`)
    .join('\n\n');

  return `You are a helpful assistant. Answer the following question based ONLY on the context provided below.

Context:
${context}

Question: ${query}

Answer: `;
}

/**
 * Generate LLM-only answer without context
 */
function generateLLMPrompt(query: string): string {
  return `${query}`;
}

/**
 * PRODUCTION: POST /api/chat with rate limiting
 * Query endpoint: Vector search + RAG + LLM parallel generation
 * Rate limit: 10 requests per minute per IP
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // PRODUCTION: Apply rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Maximum 10 queries per minute.',
          rag_answer: 'Rate limited',
          llm_only: 'Rate limited',
          retrieved_chunks: [],
        },
        { status: 429 } // Too Many Requests
      );
    }

    const body = await request.json();
    const { question, useRAG = true } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Please provide a question',
          rag_answer: 'No question provided',
          llm_only: 'No question provided',
          retrieved_chunks: [],
        },
        { status: 400 }
      );
    }

    // Load all chunks
    const allChunks = await loadAllChunks();

    if (allChunks.length === 0) {
      return NextResponse.json(
        {
          error: 'No documents loaded',
          rag_answer: 'No documents available to search',
          llm_only: 'No documents available',
          retrieved_chunks: [],
        },
        { status: 400 }
      );
    }

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(question);

    // Rank chunks using hybrid retrieval (semantic + keyword with dynamic weighting)
    const rankedChunks = rankChunks(
      question,
      queryEmbedding,
      allChunks.map((c) => ({
        id: c.id,
        doc: c.doc,
        text: c.text,
        embedding: c.embedding,
      })),
      3 // Top 3 chunks
    );

    // Prepare response chunks with metadata
    const responseChunks = rankedChunks.map((chunk) => ({
      id: chunk.id,
      doc: chunk.doc,
      text: chunk.text,
      match: parseFloat((chunk.hybrid * 100).toFixed(1)),
      semantic_score: parseFloat(chunk.semantic.toFixed(4)),
      keyword_score: parseFloat(chunk.keyword.toFixed(4)),
      hybrid_score: parseFloat(chunk.hybrid.toFixed(4)),
    }));

    // Generate RAG answer using retrieved chunks
    const ragPrompt = generateRAGPrompt(rankedChunks, question);

    // Parallel LLM generation (no context, for comparison)
    const llmPrompt = generateLLMPrompt(question);

    // Execute both in parallel for speed
    const [ragResponse, llmResponse] = await Promise.all([
      useRAG
        ? openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: ragPrompt }],
            temperature: 0.7,
            max_tokens: 500,
          })
        : Promise.resolve(null),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: llmPrompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    ]);

    const ragAnswer = ragResponse?.choices[0]?.message?.content || 'No RAG answer generated';
    const llmAnswer = llmResponse?.choices[0]?.message?.content || 'No LLM answer generated';

    const processingTime = Date.now() - startTime;

    const response: QueryResponse = {
      rag_answer: ragAnswer,
      llm_only: llmAnswer,
      retrieved_chunks: responseChunks,
      processing_time: processingTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      {
        error: 'Query failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        rag_answer: 'Error processing query',
        llm_only: 'Error processing query',
        retrieved_chunks: [],
      },
      { status: 500 }
    );
  }
}
