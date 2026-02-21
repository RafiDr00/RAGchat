import os
import re
import io
import socket
from urllib.parse import urlparse
from pathlib import Path
from typing import Optional, Tuple, List
import requests
from bs4 import BeautifulSoup
from loguru import logger

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

def is_safe_url(url: str) -> bool:
    """
    Brutal SSRF Protection: Deny private, loopback, and reserved IP ranges.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False
        
        hostname = parsed.hostname
        if not hostname:
            return False
            
        # Resolve IP
        ip_address = socket.gethostbyname(hostname)
        ip_parts = list(map(int, ip_address.split('.')))
        
        # Reserved/Private ranges
        if (
            ip_parts[0] == 10 or # 10.0.0.0/8
            (ip_parts[0] == 172 and 16 <= ip_parts[1] <= 31) or # 172.16.0.0/12
            (ip_parts[0] == 192 and ip_parts[1] == 168) or # 192.168.0.0/16
            ip_parts[0] == 127 or # 127.0.0.0/8
            ip_parts[0] == 169 and ip_parts[1] == 254 or # 169.254.0.0/16 (AWS/Metadata)
            ip_parts[0] == 0 or # 0.0.0.0
            ip_parts[0] >= 224 # Multicast/Reserved
        ):
            logger.error(f"SSRF Attempt Blocked: {url} resolves to private IP {ip_address}")
            return False
            
        return True
    except Exception as e:
        logger.error(f"URL Safety Check Failed for {url}: {e}")
        return False

def normalize_whitespace(text: str) -> str:
    """Normalize whitespace: separate paragraphs by double newlines, clean within."""
    if not text:
        return ""
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'[ \t]+', ' ', text)
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
        if "<body" in raw_text.lower() or "<html" in raw_text.lower():
            soup = BeautifulSoup(raw_text, "lxml")
            raw_text = soup.get_text(separator='\n\n')
        return normalize_whitespace(raw_text)
    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        return ""

def process_file_bytes(content: bytes, filename: str) -> Tuple[str, str]:
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
        image = Image.open(io.BytesIO(content))
        text = normalize_whitespace(pytesseract.image_to_string(image))
        doc_type = "image"
    
    if not text:
        logger.warning(f"No text extracted from {filename}")
        
    return text, doc_type

def extract_from_url(url: str) -> str:
    """Fetch content from URL with safety checks and extract text."""
    try:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
            
        if not is_safe_url(url):
            return "Error: Restricted or invalid URL destination."
            
        logger.info(f"Safe fetch initiated: {url}")
        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RAGchat-Auditor/2.1'
        })
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "lxml")
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
            
        text = soup.get_text(separator='\n\n')
        return normalize_whitespace(text)
    except Exception as e:
        logger.error(f"URL extraction error for {url}: {e}")
        return ""


