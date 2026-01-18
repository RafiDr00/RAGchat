import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import our new modular core
from rag_core.api.routes import router as rag_router

# Configure logging to be precise
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("RAGchat.API")

# Load environment
load_dotenv()

app = FastAPI(
    title="RAGchat API",
    description="High-Precision Academic RAG System",
    version="2.1.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Modular Routes
app.include_router(rag_router)

@app.on_event("startup")
async def startup_event():
    logger.info("RAGchat Backend is initializing...")
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("CRITICAL: OPENAI_API_KEY is missing from environment.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)