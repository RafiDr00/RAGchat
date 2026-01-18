import numpy as np
import re
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

def get_keyword_score(query: str, document_text: str) -> float:
    """Calculate normalized keyword overlap score."""
    def tokenize(text):
        return set(re.findall(r'\b\w{3,}\b', text.lower()))
    
    query_tokens = tokenize(query)
    doc_tokens = tokenize(document_text)
    
    if not query_tokens:
        return 0.0
        
    matches = query_tokens.intersection(doc_tokens)
    return len(matches) / len(query_tokens)

def compute_cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    """Compute cosine similarity between two L2-normalized vectors."""
    # Since vectors are normalized, sim = dot product
    sim = np.dot(v1, v2)
    return float(np.clip(sim, 0.0, 1.0))

def hybrid_retrieval(
    query: str, 
    query_vec: np.ndarray, 
    chunks: List[Dict], 
    top_k: int = 4, 
    threshold: float = 0.25
) -> List[Dict]:
    """
    Perform hybrid retrieval:
    Score = 0.8 * Semantic (Cosine) + 0.2 * Keyword
    Strict Top-K=4 and Threshold=0.25.
    """
    scored_chunks = []
    
    for chunk in chunks:
        # Semantic Score
        chunk_vec = chunk.get("embedding")
        if chunk_vec is None:
            continue
            
        semantic_score = compute_cosine_similarity(query_vec, chunk_vec)
        
        # Keyword Score
        keyword_score = get_keyword_score(query, chunk.get("text", ""))
        
        # Combine
        final_score = (0.8 * semantic_score) + (0.2 * keyword_score)
        
        # Threshold filtering
        if final_score >= threshold:
            scored_chunks.append({
                "chunk": chunk,
                "score": final_score
            })
            
    # Sort by score descending
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    
    # Selection
    results = [s["chunk"] for s in scored_chunks[:top_k]]
    
    # Logging instrumentation
    if results:
        logger.info(f"Retrieval success: {len(results)} chunks found. Top score: {scored_chunks[0]['score']:.4f}")
    else:
        logger.warning(f"Retrieval returned 0 chunks (Threshold {threshold} not met).")
        
    return results
