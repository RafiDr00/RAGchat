import os
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from loguru import logger
import numpy as np

from rag_core.embedding.embedder import Embedder
from rag_core.generation.grounded_gen import GroundedGenerator
from rag_core.ingestion.processor import process_file_bytes, extract_from_url, semantic_chunking
from config import settings

class RAGManager:
    """
    Orchestration layer for the RAG pipeline.
    Handles persistence, retrieval, and state management via Qdrant.
    """
    
    def __init__(self, collection_name: str = None):
        self.embedder = Embedder()
        self.generator = GroundedGenerator()
        self.collection_name = collection_name or settings.COLLECTION_NAME
        
        # Ensure database directory exists
        if not os.path.exists(settings.QDRANT_PATH):
            os.makedirs(settings.QDRANT_PATH)
            
        self.client = QdrantClient(path=settings.QDRANT_PATH)
        self._ensure_collection()
        logger.info(f"RAGManager: Vector DB persistence active at {settings.QDRANT_PATH}")

    def _ensure_collection(self):
        """Idempotent collection creation."""
        collections = self.client.get_collections().collections
        exists = any(c.name == self.collection_name for c in collections)
        
        if not exists:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=settings.VECTOR_SIZE, 
                    distance=Distance.COSINE
                )
            )
            logger.info(f"RAGManager: Created collection '{self.collection_name}'")

    def add_document(self, content: bytes, filename: str) -> bool:
        """Process and index a document into the vector space."""
        try:
            text, doc_type = process_file_bytes(content, filename)
            if not text:
                return False
                
            chunks = semantic_chunking(text, filename)
            points = []
            
            for i, chunk in enumerate(chunks):
                vector = self.embedder.embed(chunk["text"])
                points.append(PointStruct(
                    id=f"{filename}_{i}_{os.getpid()}_{np.random.randint(0, 100000)}",
                    vector=vector.tolist(),
                    payload={
                        "text": chunk["text"],
                        "doc_name": filename,
                        "chunk_index": chunk["chunk_index"],
                        "doc_type": doc_type
                    }
                ))
            
            self.client.upsert(collection_name=self.collection_name, points=points)
            logger.success(f"Indexed {len(points)} chunks from {filename}")
            return True
        except Exception as e:
            logger.error(f"Indexing failure for {filename}: {e}")
            return False

    def add_url(self, url: str) -> bool:
        """Process and index content from a remote URL."""
        try:
            text = extract_from_url(url)
            if not text or "Error" in text:
                return False
                
            doc_name = url.split("//")[-1].split("/")[0]
            chunks = semantic_chunking(text, doc_name)
            points = []
            
            for i, chunk in enumerate(chunks):
                vector = self.embedder.embed(chunk["text"])
                points.append(PointStruct(
                    id=f"url_{doc_name}_{i}_{np.random.randint(0, 100000)}",
                    vector=vector.tolist(),
                    payload={
                        "text": chunk["text"],
                        "doc_name": doc_name,
                        "chunk_index": chunk["chunk_index"],
                        "url": url
                    }
                ))
            
            self.client.upsert(collection_name=self.collection_name, points=points)
            logger.success(f"Indexed {len(points)} chunks from URL: {url}")
            return True
        except Exception as e:
            logger.error(f"URL Indexing failure for {url}: {e}")
            return False

    def query(self, user_input: str, top_k: int = 5):
        """Execute the full RAG cycle: Rewrite -> Retrieve -> Generate."""
        try:
            optimized_query = self.generator.rewrite_query(user_input)
            query_vec = self.embedder.embed(optimized_query)
            
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vec.tolist(),
                limit=top_k,
                score_threshold=0.20
            )
            
            retrieved = [hit.payload for hit in search_result]
            chunks_meta = [{
                "doc": hit.payload.get("doc_name", "unknown"),
                "idx": hit.payload.get("chunk_index", 0),
                "text": hit.payload.get("text", ""),
                "score": int(hit.score * 100)
            } for hit in search_result]

            return {
                "answer": self.generator.generate_answer(user_input, retrieved),
                "chunks": chunks_meta,
                "optimized_query": optimized_query
            }
        except Exception as e:
            logger.error(f"RAG Retrieval cycle failed: {e}")
            return {"answer": "Core retrieval failure.", "chunks": []}

    def clear(self):
        """Wipe the local vector database."""
        self.client.delete_collection(collection_name=self.collection_name)
        self._ensure_collection()
        logger.warning(f"RAGManager: Collection '{self.collection_name}' has been purged.")

    def get_stats(self) -> dict:
        """Retrieve telemetry data for the collection."""
        try:
            info = self.client.get_collection(collection_name=self.collection_name)
            return {
                "status": "ready",
                "chunks": info.points_count,
                "config": {
                    "vector_size": settings.VECTOR_SIZE,
                    "distance": "Cosine"
                }
            }
        except Exception:
            return {"status": "degraded", "chunks": 0}
