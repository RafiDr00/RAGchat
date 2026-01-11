from sentence_transformers import SentenceTransformer
import numpy as np

# FIX: Global model singleton to avoid re-downloading
_model_cache = None

class Embedder:
    def __init__(self):
        global _model_cache
        # FIX: Cache model after first load
        if _model_cache is None:
            _model_cache = SentenceTransformer('all-MiniLM-L6-v2')
        self.model = _model_cache

    def embed(self, text: str) -> np.ndarray:
        """Generate L2-normalized embedding for text"""
        # FIX: Handle empty strings
        if not text or not isinstance(text, str):
            # Return zero vector for empty input (consistent behavior)
            return np.zeros(384)
        
        # FIX: Ensure text is stripped
        text = text.strip()
        if not text:
            return np.zeros(384)
        
        vec = self.model.encode(text)
        norm = np.linalg.norm(vec)
        
        # FIX: Avoid division by zero
        if norm == 0:
            return np.zeros(384)
        
        return vec / norm