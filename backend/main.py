from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from rag.service import RAGService
from rag.document_processor import get_supported_extensions
import logging
import os
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data" / "documents"
# Use temp directory for uploads to avoid OneDrive sync conflicts
import tempfile
UPLOAD_DIR = Path(tempfile.gettempdir()) / "ragchat_uploads"
DATA_DIR.mkdir(exist_ok=True, parents=True)
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
logger.info(f"Upload directory: {UPLOAD_DIR}")

app = FastAPI(
    title="RAGchat",
    description="Ultra-minimal, high-fidelity RAG system with multi-format document support",
    version="2.0.0"
)

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
    """Initialize RAG service at startup"""
    global rag_service
    try:
        rag_service = RAGService(data_dir=DATA_DIR, upload_dir=UPLOAD_DIR)
        logger.info("RAG service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize RAG service: {e}")
        rag_service = None


@app.get("/health")
def health():
    """Health check with extended status"""
    if rag_service is None:
        return {"status": "initializing", "documents": 0, "chunks": 0}
    
    stats = rag_service.get_stats()
    return {
        "status": "ok",
        "documents": stats["documents"],
        "chunks": stats["chunks"],
        "doc_types": stats["doc_types"],
        "capabilities": stats["capabilities"],
        "llm_mode": stats["llm_status"]["mode"]
    }


@app.get("/capabilities")
def capabilities():
    """Return supported file types and features"""
    if rag_service is None:
        return {"error": "Service not ready"}
    
    stats = rag_service.get_stats()
    return {
        "supported_extensions": list(get_supported_extensions()),
        "capabilities": stats["capabilities"],
        "llm_status": stats["llm_status"]
    }


# Supported MIME types for Fortune 500 document handling
SUPPORTED_MIME_TYPES = {
    # Text
    'text/plain': '.txt',
    'text/markdown': '.md',
    'text/csv': '.csv',
    'application/json': '.json',
    # PDF
    'application/pdf': '.pdf',
    # Images
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/tiff': '.tiff',
    'image/bmp': '.bmp',
    'image/gif': '.gif',
    'image/webp': '.webp',
}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """Upload document - legacy endpoint"""
    return await ingest(file)


@app.post("/ingest")
async def ingest(request: Request, file: UploadFile = File(...)):
    """
    Ingest document - Fortune 500 spec with multi-format support.
    Supports: PDF, TXT, Images (with OCR)
    """
    headers = dict(request.headers)
    logger.info(f"=== INGEST REQUEST RECEIVED ===")
    logger.info(f"Headers: {headers}")
    logger.info(f"Filename: {file.filename}, Content-Type: {file.content_type}")
    
    if rag_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    # Validate file type
    content_type = file.content_type or 'application/octet-stream'
    ext = Path(file.filename).suffix.lower() if file.filename else ''
    supported_extensions = get_supported_extensions()
    
    # Check by extension or MIME type
    if ext not in supported_extensions and content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Supported: {', '.join(supported_extensions)}"
        )
    
    content = await file.read()
    
    # File size limit: 20MB
    if len(content) > 20_000_000:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")
    
    try:
        # Sanitize filename - remove invalid characters for Windows
        import re
        import uuid
        # Prepare for ingestion (always proceed from memory)
        raw_filename = os.path.basename(file.filename) if file.filename else f"upload_{int(time.time())}.{ext}"
        start_time = time.time()
        
        # Try to save to disk for persistence, but don't let it block ingestion if it fails
        try:
            # Use GUID for safe internal storage
            import uuid
            internal_filename = f"{uuid.uuid4()}{Path(raw_filename).suffix.lower() or '.tmp'}"
            save_path = (UPLOAD_DIR / internal_filename).resolve()
            
            # Ensure dir exists one last time
            UPLOAD_DIR.mkdir(exist_ok=True, parents=True)
            
            with open(str(save_path), "wb") as f:
                f.write(content)
            logger.info(f"File saved successfully to: {save_path}")
        except Exception as disk_err:
            logger.warning(f"Failed to persist file to disk: {disk_err}. Proceeding with in-memory ingestion.")
        
        safe_filename = raw_filename # Keep original name for RAG metadata
        
        # Ingest using the new bytes-based API
        result = rag_service.ingest_bytes(content, safe_filename, content_type)
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "filename": safe_filename,
            "status": result["status"],
            "doc_type": result.get("doc_type", "unknown"),
            "chunks_created": result["chunks_created"],
            "char_count": result.get("char_count", 0),
            "total_documents": len(rag_service.documents),
            "total_chunks": len(rag_service.chunks),
            "processing_time_ms": round(processing_time, 2)
        }
        
    except Exception as e:
        import traceback
        logger.error(f"Upload failed: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


class QuestionRequest(BaseModel):
    question: str


class ChatRequest(BaseModel):
    question: str
    useRAG: bool = True


@app.post("/ask")
async def ask(req: QuestionRequest):
    """Ask question - legacy endpoint"""
    return await chat(ChatRequest(question=req.question, useRAG=True))


@app.post("/chat")
async def chat(req: ChatRequest):
    """
    Chat endpoint - returns both RAG and LLM answers with processing time.
    Toggle between RAG-grounded and pure LLM modes.
    """
    if rag_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question required")
    
    try:
        start_time = time.time()
        
        rag_answer, llm_answer, retrieved_chunks = rag_service.query(
            req.question, 
            use_rag=req.useRAG
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "rag_answer": rag_answer,
            "llm_only": llm_answer,
            "retrieved_chunks": retrieved_chunks,
            "processing_time": round(processing_time, 2),
            "mode": "rag" if req.useRAG else "llm_only",
            "chunks_searched": len(rag_service.chunks)
        }
        
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/documents")
def list_documents():
    """List all ingested documents"""
    if rag_service is None:
        return {"documents": []}
    
    with rag_service.lock:
        docs = [
            {
                "filename": doc["filename"],
                "doc_type": doc.get("doc_type", "unknown"),
                "char_count": doc.get("char_count", len(doc.get("text", "")))
            }
            for doc in rag_service.documents
        ]
    
    return {"documents": docs, "total": len(docs)}


@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    """Delete a document from the index"""
    if rag_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    with rag_service.lock:
        # Remove document
        rag_service.documents = [
            d for d in rag_service.documents 
            if d["filename"] != filename
        ]
        
        # Remove associated chunks
        rag_service.chunks = [
            c for c in rag_service.chunks 
            if c["doc"] != filename
        ]
    
    # Try to delete file from disk
    for directory in [UPLOAD_DIR, DATA_DIR]:
        file_path = directory / filename
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                logger.warning(f"Could not delete file {filename}: {e}")
    
    return {"status": "deleted", "filename": filename}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)