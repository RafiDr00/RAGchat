import numpy as np
from typing import List, Dict
import re
import logging

logger = logging.getLogger(__name__)

def cosine_sim(v1: np.ndarray, v2: np.ndarray) -> float:
    """Compute cosine similarity between two vectors (L2-normalized)"""
    dot = np.dot(v1, v2)
    return float(np.clip(dot, 0.0, 1.0))

def _extract_words(text: str) -> set:
    """Extract words from text, removing punctuation and lowercase"""
    # FIX: Handle punctuation and special characters
    words = re.findall(r'\b\w+\b', text.lower())
    return set(words)

def hybrid_retrieve(
    query: str, 
    chunks: List[Dict], 
    embedder, 
    top_k: int = 4, # Top-K 3-5 only
    threshold: float = 0.35 # Similarity threshold
) -> List[Dict]:
    """
    Hybrid retrieval: cosine similarity + keyword boost.
    Strict Top-K=4 and threshold-based filtering.
    """
    if not chunks:
        return []
    
    if not query:
        return []
    
    # Get query embedding
    query_vec = embedder.embed(query)
    query_words = _extract_words(query)
    
    scored_chunks = []
    
    for idx, chunk in enumerate(chunks):
        if not isinstance(chunk, dict) or "embedding" not in chunk:
            continue
        
        # Semantic score (0-1)
        semantic_score = cosine_sim(query_vec, chunk["embedding"])
        
        # Keyword score (0-1)
        chunk_words = _extract_words(chunk["text"])
        matching_words = len(query_words & chunk_words)
        keyword_score = matching_words / len(query_words) if query_words else 0
        
        # Hybrid score (80% semantic, 20% keyword)
        total_score = semantic_score + 0.2 * keyword_score
        
        # Discard if below threshold (Academic requirement)
        if total_score < threshold:
            continue
            
        scored_chunks.append({
            "score": total_score,
            "index": idx,
            "chunk": chunk
        })
    
    # Sort strictly by score (desc), then index (asc)
    scored_chunks.sort(key=lambda x: (-x["score"], x["index"]))
    
    if scored_chunks:
        logger.info(f"Top retrieval score: {scored_chunks[0]['score']:.4f} (Threshold: {threshold})")
    else:
        logger.warning(f"No chunks met similarity threshold of {threshold}")
    
    # Return top_k chunks
    return [sc["chunk"] for sc in scored_chunks[:top_k]]