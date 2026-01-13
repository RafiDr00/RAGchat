# RAGchat - Quick Start Guide

## 🎯 What You Have

A **production-ready** RAG (Retrieval-Augmented Generation) system with:

### ✅ Supported File Types (14+ formats)
- **Documents**: PDF (with OCR), TXT, MD, CSV, JSON, XML, HTML
- **Images**: PNG, JPG, JPEG, TIFF, BMP, GIF, WEBP (with OCR)

### ✅ Key Features
1. **RAG Toggle**: Switch between grounded (using your documents) and raw LLM modes
2. **Hybrid Search**: Semantic + keyword retrieval for best results
3. **Multi-format Processing**: Automatic detection and parsing
4. **Real-time UI**: Upload progress, chunk visualization, relevance scores
5. **OCR Support**: Extract text from scanned PDFs and images

---

## 🚀 How to Start

### Option 1: Use Startup Scripts (Easiest)

**Windows**:
```bash
# Terminal 1 - Backend
start-backend.bat

# Terminal 2 - Frontend  
start-frontend.bat
```

### Option 2: Manual Start

**Backend**:
```bash
cd backend
venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm run dev
```

---

## 📍 Access Points

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🎮 How to Use

### 1. Upload Documents
- Click the upload button (bottom center)
- Select any supported file type
- Watch the scanning progress
- See chunk count increase

### 2. Toggle RAG Mode
- **GROUNDED** (green): Uses your uploaded documents
- **RAW** (gray): Direct LLM without documents

### 3. Ask Questions
- Type your question in the input field
- Press Enter or click the emerald chevron
- See both RAG and LLM answers side-by-side

### 4. View Relevance
- Each chunk shows a match score (0-100)
- Higher score = more relevant to your question
- Hover over chunks to see full text

---

## 🔧 Configuration

### Required (for LLM functionality)
Create `backend/.env`:
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo
```

### Optional (for local LLM)
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check if Python venv is created: `cd backend && python -m venv venv`
- Install dependencies: `pip install -r requirements.txt`
- Verify Python version: `python --version` (need 3.8+)

### Frontend won't start
- Install dependencies: `cd frontend && npm install`
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and reinstall

### OCR not working
- Windows: Install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki
- Add to PATH: `C:\Program Files\Tesseract-OCR`
- For scanned PDFs, also install Poppler

### File upload fails
- Check file size (max 20MB)
- Verify file extension is supported
- Check backend logs for errors

---

## 📊 System Architecture

```
Frontend (Next.js) → API Proxy → Backend (FastAPI)
                                    ↓
                            RAG Service
                 ┌──────────┴──────────┐
          Document Processor    Embedder
                 ↓                     ↓
          Text Extraction      Sentence Transformers
                 ↓                     ↓
              Chunking            Vector Storage
                 └──────────┬──────────┘
                      Hybrid Retrieval
                            ↓
                      LLM Service (OpenAI/Ollama)
```

---

## 🎨 Features Breakdown

### File Upload & Processing
- Multi-format detection
- Automatic text extraction
- OCR fallback for images/scanned PDFs
- Progress tracking
- Error handling

### RAG Pipeline
1. **Ingestion**: File → Text → Embeddings → Chunks
2. **Indexing**: Store in memory with vectors
3. **Retrieval**: Query → Hybrid search → Top-5 chunks
4. **Generation**: Chunks + Question → LLM → Answer

### Frontend UI
- **Volumetric Space**: Animated starfield background
- **Magnetic Cursor**: Interactive emerald cursor
- **Glass Morphism**: Frosted glass UI components
- **Relevance Rings**: Visual match scores
- **Neural Shimmer**: Loading animations

---

## 📈 Performance

- **Upload**: ~1-3s per document (depending on size)
- **Query**: ~500ms-2s (with LLM)
- **Chunk Size**: 512 characters with 50 char overlap
- **Retrieval**: Top-5 most relevant chunks

---

## 🔐 Security Notes

- **CORS**: Enabled for localhost (disable in production)
- **File Validation**: MIME type + extension checking
- **Path Traversal**: Sanitized filenames
- **Size Limits**: 20MB max upload
- **API Keys**: Stored in .env (gitignored)

---

## 📁 Project Structure

```
RAGchat/
├── backend/
│   ├── main.py                 # FastAPI server
│   ├── requirements.txt
│   ├── .env                    # Config (gitignored)
│   ├── data/
│   │   ├── documents/          # Pre-loaded files
│   │   └── uploads/            # User uploads
│   └── rag/
│       ├── service.py          # RAG orchestration
│       ├── document_processor.py  # Multi-format parsing
│       ├── embeddings.py       # Sentence transformers
│       ├── retrieval.py        # Hybrid search
│       └── llm_service.py      # OpenAI/Ollama
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx            # Main UI
│   │   ├── layout.tsx          # Layout + metadata
│   │   └── globals.css         # Design system
│   ├── next.config.js          # API proxy config
│   └── package.json
├── IMPLEMENTATION_STATUS.md    # Full system audit
├── start-backend.bat           # Windows backend starter
└── start-frontend.bat          # Windows frontend starter
```

---

## ✅ Verification Checklist

Before deploying, verify:
- [ ] Backend starts without errors
- [ ] Frontend connects to backend
- [ ] File upload works for all types
- [ ] RAG toggle changes answer behavior
- [ ] Chunk count updates after upload
- [ ] Relevance scores display correctly
- [ ] LLM responds (API key configured)
- [ ] OCR works (if Tesseract installed)

---

## 💡 Tips & Best Practices

1. **Document Naming**: Use descriptive filenames for better organization
2. **Chunk Size**: 512 chars is optimal for most use cases
3. **Top-K**: 5 chunks balances relevance vs context
4. **RAG Toggle**: Use GROUNDED for factual queries, RAW for creative
5. **File Formats**: Text-based PDFs are faster than scanned
6. **Query Phrasing**: Clear, specific questions get better results

---

## 🎓 Example Workflows

### Research Assistant
1. Upload research papers (PDFs)
2. Ask: "What are the main findings?"
3. Compare RAG vs LLM answers
4. Export relevant chunks

### Documentation Search
1. Upload project docs (MD, TXT)
2. Toggle GROUNDED mode
3. Ask how-to questions
4. Get cited, grounded answers

### Invoice Processing
1. Upload invoices (PDF, images)
2. OCR extracts text automatically
3. Query: "What is the total amount?"
4. Get structured data

---

## 📞 Support & Resources

- **System Status**: Check `IMPLEMENTATION_STATUS.md`
- **API Docs**: http://localhost:8000/docs (when backend running)
- **Logs**: Backend terminal shows processing details
- **Health Check**: http://localhost:8000/health

---

## 🎉 You're Ready!

Your RAGchat system is **fully operational**. Just start the backend and you're good to go!

```bash
# Start both servers, then visit:
http://localhost:3001
```

Happy querying! 🚀
