from pathlib import Path
from .embeddings import Embedder
from .retrieval import hybrid_retrieve
import logging
import threading

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self, data_dir: Path, upload_dir: Path):
        self.data_dir = data_dir
        self.upload_dir = upload_dir
        self.embedder = Embedder()
        self.documents = []
        self.chunks = []
        self.lock = threading.Lock()
        # FIX: Load documents in background to avoid blocking startup
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
            
            if not self.data_dir.exists():
                logger.warning(f"Data directory not found: {self.data_dir}")
                self.data_dir.mkdir(parents=True, exist_ok=True)
                return
            
            txt_files = list(self.data_dir.glob("*.txt"))
            if not txt_files:
                logger.warning(f"No .txt files found in {self.data_dir}")
                return
            
            for f in txt_files:
                try:
                    self.ingest_file(f)
                except Exception as e:
                    logger.error(f"Failed to ingest {f.name}: {e}")

    def ingest_file(self, path: Path):
        """Ingest a single file - atomic, thread-safe"""
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
            if not text.strip():
                logger.warning(f"File is empty: {path.name}")
                return
            
            # FIX: All embedding generation BEFORE lock to avoid blocking
            embedding = self.embedder.embed(text)
            
            # Pre-generate chunk embeddings outside lock
            chunk_size = 512
            overlap = 50
            chunks_to_add = []
            for i in range(0, len(text), chunk_size - overlap):
                chunk_text = text[i:i + chunk_size]
                if len(chunk_text.strip()) > 20:
                    chunk_embedding = self.embedder.embed(chunk_text)  # FIX: Pre-compute
                    chunks_to_add.append({
                        "doc": path.name,
                        "text": chunk_text,
                        "embedding": chunk_embedding
                    })
            
            # FIX: Atomic lock operation - only data mutations
            with self.lock:
                self.documents.append({
                    "filename": path.name,
                    "text": text,
                    "embedding": embedding
                })
                self.chunks.extend(chunks_to_add)  # FIX: Atomic extend
            
            logger.info(f"Ingested {path.name}: {len(text)} chars, {len(chunks_to_add)} chunks")
        except Exception as e:
            logger.error(f"Failed to ingest {path.name}: {e}")
            raise

    def query(self, question: str):
        """Query both RAG and LLM - deterministic, never empty"""
        try:
            # FIX: Ensure question is not None/empty
            if not question or not question.strip():
                return (
                    "Please provide a question to search.",
                    "I need a question to assist you.",
                    []
                )
            
            retrieved = hybrid_retrieve(question, self.chunks, self.embedder, top_k=5)
            
            if retrieved:
                # FIX: Include context from all retrieved chunks, not just first 3
                chunk_texts = [c["text"][:200] for c in retrieved]  # Limit to 200 chars per chunk
                rag_answer = "\n\n".join(chunk_texts)  # Better formatting
                chunk_summaries = [
                    {
                        "doc": c["doc"], 
                        "text": c["text"][:150],
                        "preview": c["text"][:100] + "..."
                    } 
                    for c in retrieved
                ]
            else:
                rag_answer = "No relevant information found in documents."
                chunk_summaries = []
            
            llm_answer = self._get_llm_answer(question)
            return rag_answer, llm_answer, chunk_summaries
        
        except Exception as e:
            logger.error(f"Query failed: {e}")
            return (
                "Error retrieving information.",
                "I encountered an error processing your question.",
                []
            )
    
    def _get_llm_answer(self, question: str) -> str:
        """Get LLM answer from Ollama or fallback - NEVER returns empty"""
        try:
            import requests
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama2", "prompt": question, "stream": False},
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get("response", self._get_fallback_answer(question))
        except Exception as e:
            logger.debug(f"Ollama unavailable: {e}")
        
        return self._get_fallback_answer(question)
    
    def _get_fallback_answer(self, question: str) -> str:
        """Deterministic LLM fallback when Ollama unavailable - NEVER empty"""
        question_lower = question.lower()
        
        # FIX: More intelligent pattern matching with better responses
        
        # Leadership/ownership questions
        if any(word in question_lower for word in ["who is", "ceo", "founder", "owner", "lead", "head"]):
            return "I don't have leadership information readily available. Please refer to company documentation."
        
        # Definition/concept questions
        elif any(word in question_lower for word in ["what is", "what are", "define", "explain"]):
            return "Please refer to the uploaded documents for detailed definitions and explanations."
        
        # How-to/tutorial questions
        elif any(word in question_lower for word in ["how do", "how to", "tutorial", "guide", "steps", "process"]):
            return "For step-by-step instructions, please consult the documentation or uploaded resources."
        
        # Yes/no questions
        elif any(word in question_lower for word in ["is it", "are you", "do you", "can you", "will it", "should"]):
            return "Based on the available documents, I cannot provide a definitive yes or no answer. Please check the docs."
        
        # Comparison/analysis questions
        elif any(word in question_lower for word in ["compare", "difference", "versus", "better", "prefer"]):
            return "Comparison analysis requires reviewing the source documents. Please check your uploaded resources."
        
        # Default fallback
        else:
            return "I'm unable to provide a complete answer without accessing Ollama. Please check your documents."