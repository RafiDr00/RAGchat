import numpy as np
from typing import List, Dict
import re

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
    top_k: int = 5
) -> List[Dict]:
    """
    Hybrid retrieval: cosine similarity + keyword boost (0.2 weight)
    Returns top_k chunks sorted by hybrid score (deterministic with index tiebreaker)
    """
    # FIX: Input validation
    if not chunks or not isinstance(chunks, list):
        return []
    
    if not query or not isinstance(query, str):
        return []
    
    # Get query embedding
    query_vec = embedder.embed(query)
    query_words = _extract_words(query)  # FIX: Use word extraction
    
    # FIX: Handle empty query
    if not query_words:
        return chunks[:top_k]  # Return first k if no keywords
    
    scored_chunks = []
    
    for idx, chunk in enumerate(chunks):
        # Validate chunk structure
        if not isinstance(chunk, dict) or "embedding" not in chunk or "text" not in chunk:
            continue
        
        # Semantic score: cosine similarity (0-1)
        semantic_score = cosine_sim(query_vec, chunk["embedding"])
        
        # Keyword score: ratio of query words found in chunk
        chunk_words = _extract_words(chunk["text"])  # FIX: Use word extraction
        matching_words = len(query_words & chunk_words)
        
        # FIX: Safe division - query_words is guaranteed non-empty here
        keyword_score = matching_words / len(query_words)
        
        # Hybrid score: semantic (80%) + keyword (20%)
        total_score = semantic_score + 0.2 * keyword_score
        
        scored_chunks.append({
            "score": total_score,
            "index": idx,
            "chunk": chunk
        })
    
    # Sort by score (descending), then by original index (ascending) for determinism
    scored_chunks.sort(key=lambda x: (-x["score"], x["index"]))
    
    # Return top_k chunks
    return [sc["chunk"] for sc in scored_chunks[:top_k]]