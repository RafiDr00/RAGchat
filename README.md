# RAGchat

A high-precision document Q&A system. Upload PDFs, text files, or URLs — ask questions and get grounded answers with source citations. Powered by OpenAI GPT-4o + Qdrant vector search.

## What It Does

- **Ingest** documents (PDF, TXT, MD) or web URLs — chunked, embedded, stored in a local Qdrant vector DB
- **Ask** questions — hybrid retrieval (semantic + keyword) surfaces the most relevant chunks
- **Answer** with grounding — GPT-4o responds only from retrieved context, no hallucination
- **Stream** responses token-by-token via SSE
- **Toggle** between RAG mode (grounded) and raw LLM mode

## Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, SlowAPI rate limiting |
| **Vector DB** | Qdrant (local persistent mode) |
| **Embeddings** | sentence-transformers all-MiniLM-L6-v2 |
| **Retrieval** | Hybrid: 80% semantic cosine + 20% keyword overlap |
| **LLM** | OpenAI GPT-4o with grounded prompts |
| **Frontend** | Next.js 14, Framer Motion, Tailwind, WebGL |
| **Ingestion** | Async background workers, Tesseract OCR support |

## Quick Start

```bash
# 1. Backend
cd backend
cp ../.env.example .env   # fill in RAGCHAT_API_KEY and OPENAI_API_KEY
pip install -r requirements.txt
python main.py            # → http://localhost:8001

# 2. Frontend
cd frontend
cp .env.example .env.local  # set BACKEND_URL and NEXT_PUBLIC_RAGCHAT_API_KEY
npm install
npm run dev               # → http://localhost:3000
```

**Docker:**
```bash
docker compose up --build
```

## Configuration

Backend (`backend/.env`):
```
RAGCHAT_API_KEY=<random string>   # protects ingest and clear endpoints
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
QDRANT_PATH=./qdrant_db
ALLOWED_ORIGINS=http://localhost:3000
```

Frontend (`frontend/.env.local`):
```
BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_RAGCHAT_API_KEY=<same as RAGCHAT_API_KEY>
```

## API

```
POST /api/ingest          # Upload document (requires X-API-Key)
POST /api/ingest-url      # Ingest URL (requires X-API-Key)
GET  /api/ingest/status/{id}  # Poll ingestion task
POST /api/chat            # Query (stream=true for SSE)
POST /api/clear           # Purge all data (requires X-API-Key)
GET  /api/health          # System health + chunk count
```

## Security

- All ingest and clear routes require `X-API-Key` header
- Rate limiting: 20 req/min (chat), 5 req/min (ingest)
- SSRF hardening on URL ingestion
- Local vector storage — no data leaves your infrastructure except OpenAI API calls
- API key must never be committed — set via environment variables only
