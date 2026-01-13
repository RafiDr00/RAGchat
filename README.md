# RAG System

Retrieval-Augmented Generation system with multi-format document support and hybrid search.

## Stack

**Backend**: FastAPI, sentence-transformers, PyPDF2, pytesseract  
**Frontend**: Next.js 15, Framer Motion, Tailwind CSS  
**LLM**: OpenAI API / Ollama (local)

## Features

- PDF text extraction + OCR for scanned documents
- Image OCR (PNG, JPG, TIFF, BMP)
- Text file ingestion (TXT, MD, CSV, JSON)
- Hybrid retrieval (semantic + keyword)
- Toggle between RAG-grounded and raw LLM responses

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3001

## Configuration

Edit `backend/.env`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-3.5-turbo
OLLAMA_URL=http://localhost:11434
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service status |
| `/ingest` | POST | Upload document |
| `/chat` | POST | Query with RAG toggle |
| `/documents` | GET | List indexed documents |

### Request

```json
{
  "question": "What is this about?",
  "useRAG": true
}
```

### Response

```json
{
  "rag_answer": "Based on documents...",
  "llm_only": "General answer...",
  "retrieved_chunks": [...],
  "processing_time": 234.5
}
```

## Structure

```
backend/
├── main.py              # FastAPI server
├── requirements.txt
├── data/
│   ├── documents/       # Pre-loaded files
│   └── uploads/         # User uploads
└── rag/
    ├── service.py       # RAG orchestration
    ├── embeddings.py    # Sentence transformers
    ├── retrieval.py     # Hybrid search
    ├── document_processor.py  # Multi-format parsing
    └── llm_service.py   # OpenAI/Ollama integration

frontend/
└── src/app/
    ├── page.tsx         # Main UI
    ├── layout.tsx
    └── globals.css
```

## OCR Setup (Optional)

**Windows**: Install [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki)  
**Mac**: `brew install tesseract poppler`  
**Linux**: `sudo apt install tesseract-ocr poppler-utils`

## License

MIT
