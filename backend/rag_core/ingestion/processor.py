import os
import re
import logging
import io
from pathlib import Path
from typing import Optional, Tuple, List

# Core dependencies
import PyPDF2
from PIL import Image
import pytesseract
from pdf2image import convert_from_path, convert_from_bytes

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

logger = logging.getLogger(__name__)

def normalize_whitespace(text: str) -> str:
    """Normalize whitespace: separate paragraphs by double newlines, clean within."""
    if not text:
        return ""
    # Standardize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Collapse multiple spaces
    text = re.sub(r'[ \t]+', ' ', text)
    # Ensure paragraphs are clearly separated but not overly spaced
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def extract_from_pdf(content: bytes) -> str:
    """Extract text from PDF with OCR fallback."""
    text_content = []
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text.strip())
        
        extracted = "\n\n".join(text_content)
        
        # If extraction is very poor, trigger OCR
        if len(extracted.strip()) < 100:
            logger.info("PDF extraction low yield, attempting OCR fallback...")
            images = convert_from_bytes(content, dpi=200)
            ocr_text = []
            for image in images:
                ocr_text.append(pytesseract.image_to_string(image))
            extracted = "\n\n".join(ocr_text)
            
        return normalize_whitespace(extracted)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""

def extract_from_docx(content: bytes) -> str:
    """Extract text from DOCX."""
    if not DOCX_AVAILABLE:
        logger.error("python-docx not installed")
        return ""
    try:
        doc = docx.Document(io.BytesIO(content))
        full_text = [para.text for para in doc.paragraphs]
        return normalize_whitespace("\n\n".join(full_text))
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""

def extract_from_text(content: bytes) -> str:
    """Extract text from TXT/HTML/XML."""
    try:
        raw_text = content.decode('utf-8', errors='replace')
        # Simple HTML tag stripping if it looks like HTML
        if "<body" in raw_text.lower() or "<html" in raw_text.lower():
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(raw_text, "lxml")
            raw_text = soup.get_text(separator='\n\n')
        return normalize_whitespace(raw_text)
    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        return ""

def process_file_bytes(content: bytes, filename: str) -> Tuple[str, str]:
    """
    Unified entry point for document text extraction.
    Returns (extracted_text, doc_type).
    """
    ext = Path(filename).suffix.lower()
    text = ""
    doc_type = "unknown"

    if ext == ".pdf":
        text = extract_from_pdf(content)
        doc_type = "pdf"
    elif ext == ".docx":
        text = extract_from_docx(content)
        doc_type = "docx"
    elif ext in [".txt", ".html", ".htm", ".xml", ".md"]:
        text = extract_from_text(content)
        doc_type = "text"
    elif ext in [".png", ".jpg", ".jpeg", ".tiff"]:
        # Direct Image OCR
        image = Image.open(io.BytesIO(content))
        text = normalize_whitespace(pytesseract.image_to_string(image))
        doc_type = "image"
    
    if not text:
        logger.warning(f"No text extracted from {filename}")
        
    return text, doc_type
