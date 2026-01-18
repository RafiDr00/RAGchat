from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
import pydantic
from .manager import RAGManager

router = APIRouter()
rag_manager = RAGManager()

class ChatRequest(pydantic.BaseModel):
    message: str

@router.post("/ingest")
async def ingest_document(file: UploadFile = File(...)):
    """API endpoint to upload and index documents."""
    content = await file.read()
    success = rag_manager.add_document(content, file.filename)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to process document.")
        
    return {"status": "success", "filename": file.filename}

@router.post("/chat")
async def chat_endpoint(message: str = Form(...)):
    """Main RAG query endpoint."""
    result = rag_manager.query(message)
    return {
        "answer": result["answer"],
        "retrieved_chunks": result["chunks"]
    }

@router.get("/health")
async def health_check():
    """System health audit."""
    return {"status": "healthy", "indexing_active": True, "chunk_count": len(rag_manager.chunks)}

@router.post("/clear")
async def clear_store():
    """Wipe the context."""
    rag_manager.clear()
    return {"status": "cleared"}
