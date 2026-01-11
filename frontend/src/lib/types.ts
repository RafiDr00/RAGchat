/**
 * Shared types for RAG system
 */

export interface DocumentChunk {
  id: string;
  doc: string; // filename
  text: string; // chunk text
  embedding: number[]; // cosine similarity normalized vector
  similarity: number; // similarity score (0-1)
}

export interface UploadResponse {
  success: boolean;
  message: string;
  chunks_created: number;
  document_name: string;
}

export interface QueryRequest {
  question: string;
}

export interface QueryResponse {
  rag_answer: string;
  llm_only: string;
  retrieved_chunks: Array<{
    id: string;
    doc: string;
    text: string;
    match: number;
    semantic_score: number;
    keyword_score: number;
    hybrid_score: number;
  }>;
  processing_time: number;
  error?: string;
  details?: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}
