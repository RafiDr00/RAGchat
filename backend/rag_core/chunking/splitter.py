import re
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

def semantic_chunking(text: str, doc_name: str, min_size: int = 400, max_size: int = 600, overlap: int = 100) -> List[Dict]:
    """
    Split text into chunks based on paragraph boundaries.
    Target size: 400-600 characters.
    Overlap: 100 characters.
    """
    if not text or not text.strip():
        return []

    # Split by paragraph boundaries
    paragraphs = re.split(r'\n\s*\n', text)
    chunks = []
    current_chunk = ""
    chunk_idx = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If adding paragraph exceeds max_size, save current and handle
        if len(current_chunk) + len(para) > max_size:
            if current_chunk:
                chunks.append({
                    "doc_name": doc_name,
                    "chunk_index": chunk_idx,
                    "text": current_chunk.strip()
                })
                chunk_idx += 1
                
                # Create overlap for next chunk
                current_chunk = current_chunk[-overlap:] if overlap > 0 else ""
            
            # If a single paragraph is larger than max_size, split it brutally
            if len(para) > max_size:
                start = 0
                while start < len(para):
                    end = start + max_size
                    piece = para[start:end]
                    
                    if len(piece) > 50: # Avoid tiny tail chunks
                        chunks.append({
                            "doc_name": doc_name,
                            "chunk_index": chunk_idx,
                            "text": piece.strip()
                        })
                        chunk_idx += 1
                    
                    start += (max_size - overlap)
                current_chunk = "" # Already handled this massive para
            else:
                current_chunk += para + "\n\n"
        else:
            current_chunk += para + "\n\n"

    # Last chunk
    if current_chunk.strip():
        chunks.append({
            "doc_name": doc_name,
            "chunk_index": chunk_idx,
            "text": current_chunk.strip()
        })

    logger.info(f"Created {len(chunks)} chunks for {doc_name}")
    return chunks
