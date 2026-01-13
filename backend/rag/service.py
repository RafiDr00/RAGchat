from pathlib import Path
from .embeddings import Embedder
from .retrieval import hybrid_retrieve
from .document_processor import process_document, process_document_bytes, get_supported_extensions, get_capabilities
from .llm_service import LLMService
import logging
import threading
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)


class RAGService:
    """Fortune 500 Grade RAG Service with Multi-Format Document Support"""
    
    def __init__(self, data_dir: Path, upload_dir: Path):
        self.data_dir = data_dir
        self.upload_dir = upload_dir
        self.embedder = Embedder()
        self.llm_service = LLMService()
        self.documents: List[Dict] = []
        self.chunks: List[Dict] = []
        self.lock = threading.Lock()
        
        # Ensure directories exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Load documents in background
        self._load_in_background()

    def _load_in_background(self):
        """Load documents in a background thread to not block startup"""
        thread = threading.Thread(target=self.load_all_documents, daemon=True)
        thread.start()

    def load_all_documents(self):
        """Load all documents from data directory - thread-safe"""
        with self.lock:
            self.documents.clear()
            self.chunks.clear()
        
        # Get supported extensions
        supported = get_supported_extensions()
        
        # Find all supported files in data and upload directories
        files_to_load = []
        
        for directory in [self.data_dir, self.upload_dir]:
            if directory.exists():
                for ext in supported:
                    files_to_load.extend(directory.glob(f"*{ext}"))
        
        if not files_to_load:
            logger.info("No documents found in data directories")
            return
        
        logger.info(f"Loading {len(files_to_load)} documents...")
        
        for f in files_to_load:
            try:
                self.ingest_file(f)
            except Exception as e:
                logger.error(f"Failed to ingest {f.name}: {e}")

    def ingest_file(self, path: Path) -> Dict:
        """Ingest a single file - supports PDF, TXT, Images"""
        try:
            # Use document processor to extract text
            text, doc_type = process_document(path)
            
            if not text or not text.strip():
                logger.warning(f"No text extracted from: {path.name}")
                return {"status": "empty", "chunks_created": 0}
            
            # Generate document embedding
            embedding = self.embedder.embed(text)
            
            # Create chunks with embeddings
            chunks_to_add = self._create_chunks(text, path.name)
            
            # Atomic lock operation - only data mutations
            with self.lock:
                self.documents.append({
                    "filename": path.name,
                    "text": text,
                    "embedding": embedding,
                    "doc_type": doc_type,
                    "char_count": len(text)
                })
                self.chunks.extend(chunks_to_add)
            
            logger.info(f"Ingested {path.name} ({doc_type}): {len(text)} chars, {len(chunks_to_add)} chunks")
            return {"status": "processed", "chunks_created": len(chunks_to_add), "doc_type": doc_type}
            
        except Exception as e:
            logger.error(f"Failed to ingest {path.name}: {e}")
            raise

    def ingest_bytes(self, content: bytes, filename: str, content_type: str) -> Dict:
        """Ingest document from bytes (for API uploads)"""
        try:
            # Use document processor to extract text from bytes
            text, doc_type = process_document_bytes(content, filename, content_type)
            
            if not text or not text.strip():
                logger.warning(f"No text extracted from: {filename}")
                return {"status": "empty", "chunks_created": 0}
            
            # Generate document embedding
            embedding = self.embedder.embed(text)
            
            # Create chunks with embeddings
            chunks_to_add = self._create_chunks(text, filename)
            
            # Atomic lock operation
            with self.lock:
                self.documents.append({
                    "filename": filename,
                    "text": text,
                    "embedding": embedding,
                    "doc_type": doc_type,
                    "char_count": len(text)
                })
                self.chunks.extend(chunks_to_add)
            
            logger.info(f"Ingested {filename} ({doc_type}): {len(text)} chars, {len(chunks_to_add)} chunks")
            return {
                "status": "processed", 
                "chunks_created": len(chunks_to_add), 
                "doc_type": doc_type,
                "char_count": len(text)
            }
            
        except Exception as e:
            logger.error(f"Failed to ingest {filename}: {e}")
            raise

    def _create_chunks(self, text: str, doc_name: str, chunk_size: int = 512, overlap: int = 50) -> List[Dict]:
        """Create text chunks with embeddings"""
        chunks = []
        
        for i in range(0, len(text), chunk_size - overlap):
            chunk_text = text[i:i + chunk_size]
            
            # Skip very short chunks
            if len(chunk_text.strip()) < 20:
                continue
            
            # Pre-compute embedding outside lock
            chunk_embedding = self.embedder.embed(chunk_text)
            
            chunks.append({
                "doc": doc_name,
                "text": chunk_text,
                "embedding": chunk_embedding,
                "start_idx": i,
                "end_idx": min(i + chunk_size, len(text))
            })
        
        return chunks

    def query(self, question: str, use_rag: bool = True) -> Tuple[str, str, List[Dict]]:
        """
        Query the RAG system.
        
        Args:
            question: User's question
            use_rag: Whether to use RAG or only LLM
            
        Returns:
            Tuple of (rag_answer, llm_answer, retrieved_chunks)
        """
        try:
            if not question or not question.strip():
                return (
                    "Please provide a question to search.",
                    "I need a question to assist you.",
                    []
                )
            
            # Retrieve relevant chunks
            retrieved = hybrid_retrieve(question, self.chunks, self.embedder, top_k=5)
            
            # Format chunks for response with match scores
            chunk_summaries = []
            for idx, chunk in enumerate(retrieved):
                # Calculate approximate relevance score (0-100)
                query_embedding = self.embedder.embed(question)
                chunk_embedding = chunk.get("embedding")
                if chunk_embedding is not None:
                    import numpy as np
                    similarity = float(np.dot(query_embedding, chunk_embedding))
                    match_score = min(100, max(0, int(similarity * 100)))
                else:
                    match_score = 80 - (idx * 10)  # Fallback: decreasing score
                
                chunk_summaries.append({
                    "doc": chunk["doc"],
                    "text": chunk["text"][:300],
                    "preview": chunk["text"][:100] + "...",
                    "match": match_score
                })
            
            # Generate RAG-grounded answer
            if retrieved and use_rag:
                rag_answer = self.llm_service.generate_rag_answer(question, retrieved)
            elif retrieved:
                # Return raw chunks if not using LLM for RAG
                rag_answer = "\n\n".join([c["text"][:250] for c in retrieved[:3]])
            else:
                rag_answer = "No relevant information found in the uploaded documents."
            
            # Generate LLM-only answer
            llm_answer = self.llm_service.generate_llm_only_answer(question)
            
            return rag_answer, llm_answer, chunk_summaries
        
        except Exception as e:
            logger.error(f"Query failed: {e}")
            return (
                "Error retrieving information from documents.",
                "I encountered an error processing your question.",
                []
            )

    def get_stats(self) -> Dict:
        """Get service statistics"""
        with self.lock:
            doc_types = {}
            for doc in self.documents:
                dt = doc.get("doc_type", "unknown")
                doc_types[dt] = doc_types.get(dt, 0) + 1
            
            return {
                "documents": len(self.documents),
                "chunks": len(self.chunks),
                "doc_types": doc_types,
                "capabilities": get_capabilities(),
                "llm_status": self.llm_service.get_status()
            }