import logging
import threading
from typing import List, Dict, Tuple
import numpy as np

from ..ingestion.processor import process_file_bytes
from ..chunking.splitter import semantic_chunking
from ..embeddings.embedder import Embedder
from ..retrieval.hybrid import hybrid_retrieval
from ..generation.grounded_gen import GroundedGenerator

logger = logging.getLogger(__name__)

class RAGManager:
    """Orchestrates the modular RAG pipeline without global mutable state."""
    
    def __init__(self):
        self.embedder = Embedder()
        self.generator = GroundedGenerator()
        self.chunks: List[Dict] = []
        self.lock = threading.Lock()
        logger.info("RAGManager initialized and RAG Core modules loaded.")

    def add_document(self, content: bytes, filename: str) -> bool:
        """Process, chunk, and embed a new document."""
        try:
            # 1. Extraction & Normalization
            text, doc_type = process_file_bytes(content, filename)
            if not text:
                return False
                
            # 2. Semantic Chunking
            raw_chunks = semantic_chunking(text, filename)
            
            # 3. Embedding (Pre-calculate before lock)
            processed_chunks = []
            for chunk in raw_chunks:
                chunk["embedding"] = self.embedder.embed(chunk["text"])
                processed_chunks.append(chunk)
                
            # 4. Storage (Thread-safe)
            with self.lock:
                self.chunks.extend(processed_chunks)
                
            logger.info(f"Successfully indexed '{filename}' with {len(processed_chunks)} chunks.")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document {filename}: {e}")
            return False

    def query(self, user_input: str) -> Dict:
        """Complete RAG pipeline execution."""
        try:
            # Step 1: Query Preprocessing
            optimized_query = self.generator.rewrite_query(user_input)
            
            # Step 2: Query Embedding
            query_vec = self.embedder.embed(optimized_query)
            
            # Step 3: Hybrid Retrieval
            with self.lock:
                # Copy chunks list for search
                current_chunks = self.chunks[:]
                
            retrieved = hybrid_retrieval(
                query=optimized_query,
                query_vec=query_vec,
                chunks=current_chunks,
                top_k=4,
                threshold=0.25
            )
            
            # Step 4: Final Generation
            # If retrieved is empty, generator handles refusal internally
            rag_answer = self.generator.generate_answer(user_input, retrieved)
            
            # Additional logic: Match score calculation for metadata (UI display)
            chunk_metadata = []
            for chunk in retrieved:
                sim = float(np.dot(query_vec, chunk["embedding"]))
                chunk_metadata.append({
                    "doc": chunk["doc_name"],
                    "idx": chunk["chunk_index"],
                    "text": chunk["text"],
                    "score": int(sim * 100)
                })

            return {
                "answer": rag_answer,
                "chunks": chunk_metadata
            }
            
        except Exception as e:
            logger.error(f"RAG Query execution failed: {e}")
            return {
                "answer": "A systemic error occurred during retrieval.",
                "chunks": []
            }

    def clear(self):
        """Clear all indexed documents."""
        with self.lock:
            self.chunks.clear()
        logger.info("Document store cleared.")
