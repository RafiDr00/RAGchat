import os
import sys
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from loguru import logger

class Settings(BaseSettings):
    """
    Project settings and environment configuration.
    Uses Pydantic Settings for type-safe configuration.
    """
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # API Configuration
    PROJECT_NAME: str = "RAGchat Enterprise"
    VERSION: str = "2.4.0"
    API_V1_STR: str = "/api"
    
    # Security
    RAGCHAT_API_KEY: str
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # RAG Core
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"  # Upgraded to high-precision standard
    COLLECTION_NAME: str = "rag_collection"
    VECTOR_SIZE: int = 384  # Based on sentence-transformers all-MiniLM-L6-v2
    
    # Rate Limiting
    RATE_LIMIT_INGEST: str = "5 per minute"
    RATE_LIMIT_CHAT: str = "20 per minute"

    # Persistence
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    QDRANT_PATH: str = os.path.join(BASE_DIR, "qdrant_db")

# Initialize settings
try:
    settings = Settings()
except Exception as e:
    logger.critical(f"Configuration Error: {e}")
    # Fallback for dev environment or show descriptive error
    sys.exit(1)

# Configure Logging
def setup_logging():
    logger.remove()
    logger.add(
        sys.stdout, 
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO"
    )
    logger.info("Logging system initialized.")
