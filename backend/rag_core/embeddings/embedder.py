import numpy as np
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger(__name__)

class Embedder:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Embedder, cls).__new__(cls)
            logger.info("Initializing SentenceTransformer: all-MiniLM-L6-v2")
            cls._model = SentenceTransformer('all-MiniLM-L6-v2')
        return cls._instance

    def embed(self, text: str) -> np.ndarray:
        """
        Generate L2-normalized embedding for text.
        Returns a 384-dimensional numpy array.
        """
        if not text or not isinstance(text, str) or not text.strip():
            return np.zeros(384)
        
        # Encode text
        embedding = self._model.encode(text.strip())
        
        # L2 Normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        else:
            embedding = np.zeros(384)
            
        return embedding
