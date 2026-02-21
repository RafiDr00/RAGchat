# RAGchat Engineering Specs & Architectural Protocol

## Core Philosophy
RAGchat is built as a high-precision, zero-hallucination document auditor. It prioritizes **grounding** (answering only from provided text) over **generalization**.

## Technical Stack
- **Backend**: FastAPI (Python 3.11) with SlowAPI for rate limiting.
- **Vector DB**: Qdrant (Local persistent mode).
- **LLM Engine**: OpenAI GPT-4o with proprietary grounded prompts.
- **Frontend**: Next.js 14, Framer Motion, Tailwind CSS, Atomic Architecture.
- **Ingestion**: Asynchronous workers with Tesseract OCR support.

## Security Posture
1. **API Key Guarding**: `verify_api_key` dependency on all ingestion/purge routes.
2. **SSRF Hardening**: Recursive URL resolution check to block private IP fetching.
3. **Rate Limiting**: Tiered limiting (Chat: 20/min, Ingest: 5/min).
4. **Data Privacy**: Local vector storage.

## Developer Quickstart
1. `make install`
2. Configure `.env` based on `.env.example`
3. `make dev` (for local backend) or `make up` (for full Docker stack).

## Production Deployment Checklist
- [ ] Swap `RAGCHAT_API_KEY` for a high-entropy string.
- [ ] Ensure `ALLOWED_ORIGINS` is locked to production domain.
- [ ] Volume mount `qdrant_db` for persistence across container restarts.
- [ ] Configure `SENTRY_DSN` or similar for monitoring (Hook placeholders in `main.py`).
