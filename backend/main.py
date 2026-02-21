from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from loguru import logger

from rag_core.api.routes import router as rag_router, limiter, _rate_limit_exceeded_handler
from config import settings, setup_logging
from errors import global_exception_handler

# Initialize standardized logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise-Grade High-Precision RAG Auditor",
    version=settings.VERSION
)

# Register Global Exception Handler
app.add_exception_handler(Exception, global_exception_handler)

# Register Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular Routes
app.include_router(rag_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    logger.info(f"RAGchat Engine {settings.VERSION} booting up...")
    if not settings.OPENAI_API_KEY:
        logger.critical("SYSTEM SHUTDOWN: OPENAI_API_KEY is missing. RAG Core extraction protocol will fail.")
    
    logger.success("Core Engine ready. Port: 8001. Rate limiting enabled.")

if __name__ == "__main__":
    import uvicorn
    # High-concurrency worker strategy for industrial loads
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True, # Reload only for local development
        workers=1     # Set to 4+ in production Docker
    )
