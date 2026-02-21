import time
import uuid
import json
from typing import Dict, List, Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends, Header, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from loguru import logger

from rag_core.api.manager import RAGManager
from rag_core.api.registry import TaskRegistry
from config import settings

router = APIRouter()
rag_manager = RAGManager()
task_registry = TaskRegistry()

class ChatRequest(BaseModel):
    question: str
    useRAG: bool = True
    stream: bool = False

class URLRequest(BaseModel):
    url: str

def verify_api_key(x_api_key: str = Header(...)):
    """Enterprise API Key Enforcement Gateway."""
    if x_api_key != settings.RAGCHAT_API_KEY:
        logger.warning(f"Unauthorized access attempt with key: {x_api_key[:4]}***")
        raise HTTPException(status_code=403, detail="Invalid Security Credentials.")
    return x_api_key

async def background_ingest_document(task_id: str, content: bytes, filename: str):
    """Async worker for heavy document processing."""
    task_registry.update(task_id, status="processing", progress=20)
    success = rag_manager.add_document(content, filename)
    if success:
        task_registry.update(task_id, status="completed", progress=100)
        logger.info(f"Task {task_id}: Document indexing successful.")
    else:
        task_registry.update(task_id, status="failed")
        logger.error(f"Task {task_id}: Document indexing failed.")

async def background_ingest_url(task_id: str, url: str):
    """Async worker for URL scraping/indexing."""
    task_registry.update(task_id, status="processing", progress=30)
    success = rag_manager.add_url(url)
    if success:
        task_registry.update(task_id, status="completed", progress=100)
    else:
        task_registry.update(task_id, status="failed")

@router.get("/health")
async def health_check():
    """System health telemetry."""
    stats = rag_manager.get_stats()
    return {
        "status": "operational",
        "version": settings.VERSION,
        "engine": "RAGchat-Grounded-Alpha",
        **stats
    }

@router.post("/ingest", dependencies=[Depends(verify_api_key)])
async def ingest_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Multipart document ingestion entry point."""
    content = await file.read()
    task_id = str(uuid.uuid4())
    task_registry.register(task_id, meta={"file": file.filename})
    background_tasks.add_task(background_ingest_document, task_id, content, file.filename)
    return {"task_id": task_id, "status": "queued"}

@router.post("/ingest-url", dependencies=[Depends(verify_api_key)])
async def ingest_url(background_tasks: BackgroundTasks, request: URLRequest):
    """Remote link ingestion entry point."""
    task_id = str(uuid.uuid4())
    task_registry.register(task_id, meta={"url": request.url})
    background_tasks.add_task(background_ingest_url, task_id, request.url)
    return {"task_id": task_id, "status": "queued"}

@router.get("/ingest/status/{task_id}")
async def get_ingest_status(task_id: str):
    """Check status of backgrounded ingestion jobs."""
    status = task_registry.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Ingestion task identification not found.")
    return status

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """The central RAG chat gateway."""
    logger.info(f"Chat Request: '{request.question[:40]}...' [RAG={request.useRAG}]")
    
    if not request.stream:
        # Standard synchronous response
        result = rag_manager.query(request.question)
        return result
    
    # SSE Stream Implementation
    async def sse_stream():
        try:
            # 1. Retrieval Phase
            optimized_query = rag_manager.generator.rewrite_query(request.question)
            query_vec = rag_manager.embedder.embed(optimized_query)
            search_result = rag_manager.client.search(
                collection_name=rag_manager.collection_name,
                query_vector=query_vec.tolist(),
                limit=5,
                score_threshold=0.20
            )
            
            chunks_meta = [{
                "doc": hit.payload.get("doc_name", "unknown"),
                "idx": hit.payload.get("chunk_index", 0),
                "text": hit.payload.get("text", ""),
                "score": int(hit.score * 100)
            } for hit in search_result]

            yield f"data: {json.dumps({'chunks': chunks_meta})}\n\n"

            # 2. Generation Phase
            retrieved = [hit.payload for hit in search_result]
            for token in rag_manager.generator.stream_answer(request.question, retrieved):
                if token:
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    
            yield "data: [DONE]\n\n"
        except Exception as e:
            logger.error(f"SSE Pipeline crashed: {e}")
            yield f"data: {json.dumps({'error': 'Internal Pipeline Failure'})}\n\n"

    return StreamingResponse(sse_stream(), media_type="text/event-stream")

@router.post("/clear", dependencies=[Depends(verify_api_key)])
async def clear_database():
    """Purge all vector metadata and document state."""
    rag_manager.clear()
    task_registry.clear()
    return {"status": "purged", "message": "System state reset successfully."}
