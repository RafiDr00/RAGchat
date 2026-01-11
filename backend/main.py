from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from rag.service import RAGService
import logging
import os
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data" / "documents"
UPLOAD_DIR = Path(__file__).parent / "data" / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

app = FastAPI(title="Minimal RAG Demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG service - initialized at startup only
rag_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize RAG service at startup, NOT at import time"""
    global rag_service
    try:
        rag_service = RAGService(data_dir=DATA_DIR, upload_dir=UPLOAD_DIR)
        logger.info(f"RAG service initialized: {len(rag_service.documents)} documents, {len(rag_service.chunks)} chunks")
    except Exception as e:
        logger.error(f"Failed to initialize RAG service: {e}")
        # FIX: Don't retry - let it fail and be handled by health check
        rag_service = None

@app.get("/health")
def health():
    """Health check - never crashes"""
    if rag_service is None:
        return {"status": "initializing", "documents": 0, "chunks": 0}
    return {
        "status": "ok",
        "documents": len(rag_service.documents),
        "chunks": len(rag_service.chunks),
    }

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """Upload document - atomic, thread-safe"""
    if rag_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if file.content_type != "text/plain":
        raise HTTPException(status_code=400, detail="Only .txt files allowed")
    
    content = await file.read()
    if len(content) > 5_000_000:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    try:
        # FIX: Sanitize filename - prevent path traversal
        safe_filename = os.path.basename(file.filename)
        if not safe_filename or ".." in safe_filename:
            raise ValueError("Invalid filename")
        
        path = UPLOAD_DIR / safe_filename
        with open(path, "wb") as f:
            f.write(content)
        rag_service.ingest_file(path)
        return {
            "filename": safe_filename,
            "status": "uploaded",
            "total_documents": len(rag_service.documents),
            "total_chunks": len(rag_service.chunks),
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# FIX: Define request model for JSON body
class QuestionRequest(BaseModel):
    question: str

@app.post("/ask")
async def ask(req: QuestionRequest):
    """Ask question - always returns both RAG and LLM answers with latency"""
    if rag_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question required")
    
    try:
        start_time = time.time()
        rag_answer, llm_answer, retrieved_chunks = rag_service.query(req.question)
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        
        return {
            "rag_answer": rag_answer,
            "llm_only": llm_answer,
            "retrieved_chunks": retrieved_chunks,
            "processing_time": round(processing_time, 2),  # Latency in milliseconds
        }
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)