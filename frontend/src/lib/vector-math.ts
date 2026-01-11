/**
 * PRODUCTION VECTOR MATHEMATICS - HARDENED
 * Implements cosine similarity with epsilon-based comparison for deterministic results
 * Includes dynamic hybrid scoring based on query characteristics
 */

/**
 * PRODUCTION: Floating-point equality with EPSILON tolerance
 * Fixes non-deterministic tie-breaking in sort operations
 */
const EPSILON = 1e-6;

function floatEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * Compute cosine similarity between two L2-normalized vectors
 * @param v1 First vector (1D array)
 * @param v2 Second vector (1D array)
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  // Compute dot product
  let dotProduct = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
  }

  // Clamp to [0, 1] range (vectors are already L2-normalized)
  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Extract words from text for keyword matching
 * Lowercase, remove punctuation
 * @param text Input text
 * @returns Set of words
 */
export function extractWords(text: string): Set<string> {
  const wordPattern = /\b\w+\b/g;
  const matches = text.toLowerCase().match(wordPattern) || [];
  return new Set(matches);
}

/**
 * Compute keyword overlap score between query and text
 * @param queryWords Query keywords
 * @param textWords Text keywords
 * @returns Overlap ratio (0-1)
 */
export function keywordScore(queryWords: Set<string>, textWords: Set<string>): number {
  if (queryWords.size === 0) return 0;

  let matches = 0;
  queryWords.forEach((word) => {
    if (textWords.has(word)) {
      matches++;
    }
  });

  return matches / queryWords.size;
}

/**
 * PRODUCTION: Hybrid retrieval score with DYNAMIC weighting
 * Detects keyword-heavy queries (short, minimal stop words)
 * - Short queries (< 5 words): 60% semantic + 40% keyword
 * - Normal queries (5-15 words): 75% semantic + 25% keyword
 * - Long queries (> 15 words): 80% semantic + 20% keyword
 * 
 * This prevents keyword-heavy questions from being overshadowed by semantic similarity
 * @param semanticScore Cosine similarity (0-1)
 * @param keywordScore Keyword overlap (0-1)
 * @param queryWords Query words for length detection
 * @returns Hybrid score (0-1)
 */
export function hybridScore(
  semanticScore: number,
  keywordScore: number,
  queryWords?: Set<string>
): number {
  const wordCount = queryWords?.size || 0;
  
  // Dynamic weighting based on query length
  let semanticWeight = 0.8;
  let keywordWeight = 0.2;

  if (wordCount > 0) {
    if (wordCount < 5) {
      // Short query: rely more on keyword match
      semanticWeight = 0.6;
      keywordWeight = 0.4;
    } else if (wordCount < 15) {
      // Medium query: balanced hybrid
      semanticWeight = 0.75;
      keywordWeight = 0.25;
    }
    // Long query defaults to 80/20
  }

  return semanticWeight * semanticScore + keywordWeight * keywordScore;
}

/**
 * Score a single chunk against a query
 * @param query Query text
 * @param queryEmbedding Query embedding vector
 * @param chunkText Chunk text
 * @param chunkEmbedding Chunk embedding vector
 * @returns Object with scores
 */
export function scoreChunk(
  query: string,
  queryEmbedding: number[],
  chunkText: string,
  chunkEmbedding: number[]
): { semantic: number; keyword: number; hybrid: number } {
  const queryWords = extractWords(query);
  const chunkWords = extractWords(chunkText);

  const semantic = cosineSimilarity(queryEmbedding, chunkEmbedding);
  const keyword = keywordScore(queryWords, chunkWords);
  const hybrid = hybridScore(semantic, keyword, queryWords);

  return { semantic, keyword, hybrid };
}

/**
 * Interface for ranked chunks
 */
export interface RankedChunk {
  id: string;
  doc: string;
  text: string;
  embedding: number[];
  semantic: number;
  keyword: number;
  hybrid: number;
  index: number; // For deterministic tiebreaking
}

/**
 * PRODUCTION: Rank chunks with EPSILON-based comparison and deterministic sorting
 * Fixes non-deterministic results from floating-point comparison
 * 
 * Sort order:
 * 1. Primary: Hybrid score (descending) with epsilon tolerance
 * 2. Secondary: Semantic score (descending) with epsilon tolerance
 * 3. Tertiary: Original index (ascending) for determinism
 * 
 * @param query Query text
 * @param queryEmbedding Query embedding
 * @param chunks Array of chunks with embeddings
 * @param topK Number of top results to return
 * @returns Ranked chunks sorted deterministically by hybrid score
 */
export function rankChunks(
  query: string,
  queryEmbedding: number[],
  chunks: Array<{ id: string; doc: string; text: string; embedding: number[] }>,
  topK: number = 3
): RankedChunk[] {
  if (!chunks || chunks.length === 0) return [];
  if (!query || query.trim().length === 0) return chunks.slice(0, topK) as any;

  const ranked = chunks.map((chunk, index) => {
    const scores = scoreChunk(query, queryEmbedding, chunk.text, chunk.embedding);
    return {
      ...chunk,
      semantic: scores.semantic,
      keyword: scores.keyword,
      hybrid: scores.hybrid,
      index,
    };
  });

  // PRODUCTION: Epsilon-based comparison for deterministic sorting
  ranked.sort((a, b) => {
    // Primary: Compare hybrid scores with epsilon
    if (!floatEqual(a.hybrid, b.hybrid)) {
      return b.hybrid - a.hybrid; // Descending
    }

    // Secondary: Compare semantic scores with epsilon
    if (!floatEqual(a.semantic, b.semantic)) {
      return b.semantic - a.semantic; // Descending
    }

    // Tertiary: Index for strict determinism
    return a.index - b.index; // Ascending
  });

  return ranked.slice(0, topK);
}
