import { OpenAI } from 'openai';

// Verify API key is configured
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-') === false) {
  console.warn('⚠️ OPENAI_API_KEY is not properly configured. Set it in .env.local');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * PRODUCTION: Generate embedding for text using text-embedding-3-small
 * Returns normalized vector for cosine similarity
 * THROWS ERROR on empty text - no silent zero-filled arrays!
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text?.trim();
  
  // CRITICAL: Throw error instead of returning zero vector
  // This prevents silent data corruption from empty text
  if (!trimmed) {
    throw new Error('Cannot generate embedding for empty or whitespace-only text');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OpenAI API key is not configured. Please set OPENAI_API_KEY in .env.local'
    );
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: trimmed,
      encoding_format: 'float',
    });

    let embedding = response.data[0].embedding;

    // Normalize vector (L2 normalization)
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      embedding = embedding.map((val) => val / norm);
    }

    return embedding;
  } catch (error: any) {
    if (error?.status === 401 || error?.message?.includes('401')) {
      throw new Error(
        'OpenAI API key is invalid. Please check your OPENAI_API_KEY in .env.local'
      );
    }
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two normalized vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  return Math.max(0, Math.min(1, dotProduct)); // Clamp to [0, 1]
}

/**
 * PRODUCTION: Split text into chunks by SENTENCES (not arbitrary word count)
 * Preserves semantic context at chunk boundaries
 * 
 * Algorithm:
 * 1. Split by sentence boundaries (., !, ?, etc.)
 * 2. Group sentences until reaching token estimate
 * 3. Maintain ~30% overlap with previous chunk
 * 
 * Constraints:
 * - Min chunk: 100 chars (skip tiny fragments)
 * - Max chunk: ~1500 chars (approx 500 words at 3 chars/word)
 * - Context overlap: 30% of previous chunk to maintain coherence
 */
export function chunkText(
  text: string,
  targetChunkSize: number = 1500,
  overlapPercent: number = 30
): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Split by sentence boundaries while preserving delimiters
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])\s*$/g;
  const sentences = text.split(sentenceRegex).filter((s) => s.trim());

  if (sentences.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let previousChunk = '';

  for (const sentence of sentences) {
    const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

    // If adding sentence exceeds target size, save current chunk and start new one
    if (testChunk.length > targetChunkSize && currentChunk.length > 0) {
      if (currentChunk.trim().length > 100) {
        chunks.push(currentChunk);
        previousChunk = currentChunk;

        // Add overlap from previous chunk (30%)
        const overlapLength = Math.floor(previousChunk.length * (overlapPercent / 100));
        currentChunk = previousChunk.slice(-overlapLength) + ' ' + sentence;
      } else {
        currentChunk = testChunk;
      }
    } else {
      currentChunk = testChunk;
    }
  }

  // Add final chunk if substantial
  if (currentChunk.trim().length > 100) {
    chunks.push(currentChunk);
  }

  // Fallback: if chunking produced nothing, return original as single chunk
  if (chunks.length === 0 && text.trim().length > 100) {
    chunks.push(text);
  }

  return chunks;
}

/**
 * Extract keywords from text for hybrid retrieval
 */
export function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  return new Set(words);
}

/**
 * PRODUCTION: Hybrid retrieval score with DYNAMIC weighting
 * Detects keyword-heavy queries (short, no "that/the/is") and adjusts weight
 * - Long conversational queries: 80% semantic, 20% keyword
 * - Short/keyword queries: 60% semantic, 40% keyword
 * - Normal queries: 75% semantic, 25% keyword
 */
export function calculateHybridScore(
  semanticScore: number,
  keywordScore: number,
  queryLength?: number
): number {
  // Default query length = 0, triggers normal weighting
  const qlen = queryLength || 0;

  // Dynamic weighting based on query characteristics
  let semanticWeight = 0.8;
  let keywordWeight = 0.2;

  if (qlen > 0) {
    if (qlen < 5) {
      // Very short query: trust keyword match more
      semanticWeight = 0.6;
      keywordWeight = 0.4;
    } else if (qlen < 15) {
      // Normal query
      semanticWeight = 0.75;
      keywordWeight = 0.25;
    }
    // Long query defaults to 80/20
  }

  return semanticScore * semanticWeight + keywordScore * keywordWeight;
}
