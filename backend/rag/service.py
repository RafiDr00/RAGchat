from pathlib import Path
from .embeddings import Embedder
from .retrieval import hybrid_retrieve
from .document_processor import process_document, process_document_bytes, get_supported_extensions, get_capabilities
from .llm_service import LLMService
import logging
import threading
import re
import numpy as np
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

    def _create_chunks(self, text: str, doc_name: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict]:
        """
        Create semantic text chunks.
        Chunk size: 400-600 characters (~100-150 words)
        Overlap: 50-100 characters
        Preserves semantic boundaries (paragraphs)
        """
        chunks = []
        
        # Split by paragraph first to preserve semantic boundaries
        paragraphs = re.split(r'\n\s*\n', text)
        
        current_chunk = ""
        chunk_idx = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
                
            # If paragraph is too large, split by sentences or just slice as fallback
            if len(para) > chunk_size:
                # Direct split for very large blocks
                for i in range(0, len(para), chunk_size - overlap):
                    chunk_text = para[i:i + chunk_size]
                    if len(chunk_text.strip()) > 50:
                        chunks.append({
                            "doc": doc_name,
                            "chunk_index": chunk_idx,
                            "text": chunk_text,
                            "embedding": self.embedder.embed(chunk_text),
                            "metadata": {"doc_id": doc_name, "chunk_index": chunk_idx}
                        })
                        chunk_idx += 1
            else:
                # Check if adding this paragraph exceeds chunk size
                if len(current_chunk) + len(para) > chunk_size:
                    # Save current chunk and start new one
                    if current_chunk.strip():
                        chunks.append({
                            "doc": doc_name,
                            "chunk_index": chunk_idx,
                            "text": current_chunk.strip(),
                            "embedding": self.embedder.embed(current_chunk),
                            "metadata": {"doc_id": doc_name, "chunk_index": chunk_idx}
                        })
                        chunk_idx += 1
                    # Start new chunk with overlap from previous if possible
                    overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else ""
                    current_chunk = overlap_text + para + "\n\n"
                else:
                    current_chunk += para + "\n\n"
                    
        # Add remaining text
        if current_chunk.strip():
            chunks.append({
                "doc": doc_name,
                "chunk_index": chunk_idx,
                "text": current_chunk.strip(),
                "embedding": self.embedder.embed(current_chunk),
                "metadata": {"doc_id": doc_name, "chunk_index": chunk_idx}
            })
            
        return chunks

    def query(self, question: str, use_rag: bool = True) -> Tuple[str, str, List[Dict]]:
        """
        Query the RAG system.
        
        Args:
            question: User's question
        Academic RAG Query Pipeline:
        1. Pre-process query (search-optimized)
        2. Retrieve (Threshold + Top-K)
        3. Grounded Answer Generation
        """
        try:
            if not question or not question.strip():
                return ("Please ask a valid question.", "", [])
            
            # Step 1: Pre-process query for better retrieval
            search_query = self.llm_service.preprocess_query(question)
            
            # Step 2: Retrieve with strict threshold and Top-K=4
            retrieved = hybrid_retrieve(search_query, self.chunks, self.embedder, top_k=4, threshold=0.25)
            
            # Step 3: Generate strictly grounded answer
            rag_answer = self.llm_service.generate_rag_answer(question, retrieved)
            
            # Step 4: Generate LLM baseline (for comparison)
            llm_answer = self.llm_service.generate_llm_only_answer(question)
            
            # Format chunks with actual scores for the UI
            query_vec = self.embedder.embed(search_query)
            chunk_summaries = []
            for chunk in retrieved:
                sim = float(np.dot(query_vec, chunk["embedding"]))
                chunk_summaries.append({
                    "doc": chunk["doc"],
                    "chunk_index": chunk.get("chunk_index", 0),
                    "text": chunk["text"],
                    "match_score": int(sim * 100)
                })
                
            return (rag_answer, llm_answer, chunk_summaries)
        
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