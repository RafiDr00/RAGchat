"""
Document Processor - Multi-Format Document Ingestion
Supports: PDF, Text (TXT, MD, CSV, JSON, XML, HTML), Images (PNG, JPG, JPEG, TIFF, BMP, GIF, WEBP)
"""
import os
import logging
from pathlib import Path
from typing import Optional, Tuple
import io

logger = logging.getLogger(__name__)

# OCR support detection
try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("OCR dependencies not installed. Image processing unavailable.")

# PDF support detection  
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logger.warning("PyPDF2 not installed. PDF processing unavailable.")

# PDF to image for scanned PDF OCR
try:
    from pdf2image import convert_from_path, convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logger.warning("pdf2image not installed. Scanned PDF OCR unavailable.")


SUPPORTED_TEXT_EXTENSIONS = {'.txt', '.md', '.csv', '.json', '.xml', '.html'}
SUPPORTED_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif', '.webp'}
SUPPORTED_PDF_EXTENSIONS = {'.pdf'}


def get_supported_extensions() -> set:
    """Return all supported file extensions"""
    extensions = SUPPORTED_TEXT_EXTENSIONS.copy()
    if PDF_AVAILABLE:
        extensions.update(SUPPORTED_PDF_EXTENSIONS)
    if OCR_AVAILABLE:
        extensions.update(SUPPORTED_IMAGE_EXTENSIONS)
    return extensions


def extract_text_from_image(image_path: Path) -> Optional[str]:
    """Extract text from image using Tesseract OCR"""
    if not OCR_AVAILABLE:
        logger.warning("OCR not available - skipping image processing")
        return None
    
    try:
        image = Image.open(image_path)
        # Convert to RGB if needed (for PNG with alpha channel)
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Run OCR with English language
        text = pytesseract.image_to_string(image, lang='eng')
        
        if text.strip():
            logger.info(f"OCR extracted {len(text)} chars from {image_path.name}")
            return text.strip()
        else:
            logger.warning(f"No text found in image: {image_path.name}")
            return None
            
    except Exception as e:
        logger.error(f"OCR failed for {image_path.name}: {e}")
        return None


def extract_text_from_image_bytes(image_bytes: bytes, filename: str) -> Optional[str]:
    """Extract text from image bytes using Tesseract OCR"""
    if not OCR_AVAILABLE:
        return None
    
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        text = pytesseract.image_to_string(image, lang='eng')
        if text.strip():
            logger.info(f"OCR extracted {len(text)} chars from {filename}")
            return text.strip()
        return None
    except Exception as e:
        logger.error(f"OCR failed for {filename}: {e}")
        return None


def extract_text_from_pdf(pdf_path: Path) -> Optional[str]:
    """Extract text from PDF - handles both text-based and scanned PDFs"""
    if not PDF_AVAILABLE:
        logger.warning("PDF processing not available")
        return None
    
    try:
        text_content = []
        
        # First try to extract text directly (text-based PDF)
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_content.append(page_text.strip())
        
        extracted_text = "\n\n".join(text_content)
        
        # If we got meaningful text, return it
        if len(extracted_text) > 50:
            logger.info(f"PDF text extraction: {len(extracted_text)} chars from {pdf_path.name}")
            return extracted_text
        
        # Otherwise, try OCR on the PDF pages (scanned PDF)
        if PDF2IMAGE_AVAILABLE and OCR_AVAILABLE:
            logger.info(f"Text extraction failed, attempting OCR on PDF: {pdf_path.name}")
            return extract_text_from_scanned_pdf(pdf_path)
        else:
            logger.warning(f"PDF appears to be scanned but OCR not available: {pdf_path.name}")
            return extracted_text if extracted_text else None
            
    except Exception as e:
        logger.error(f"PDF processing failed for {pdf_path.name}: {e}")
        return None


def extract_text_from_scanned_pdf(pdf_path: Path) -> Optional[str]:
    """OCR text from scanned PDF by converting pages to images"""
    if not PDF2IMAGE_AVAILABLE or not OCR_AVAILABLE:
        return None
    
    try:
        # Convert PDF pages to images
        images = convert_from_path(pdf_path, dpi=200)
        
        text_content = []
        for i, image in enumerate(images):
            page_text = pytesseract.image_to_string(image, lang='eng')
            if page_text.strip():
                text_content.append(f"[Page {i+1}]\n{page_text.strip()}")
        
        if text_content:
            result = "\n\n".join(text_content)
            logger.info(f"PDF OCR extracted {len(result)} chars from {len(images)} pages")
            return result
        
        return None
        
    except Exception as e:
        logger.error(f"Scanned PDF OCR failed for {pdf_path.name}: {e}")
        return None


def extract_text_from_pdf_bytes(pdf_bytes: bytes, filename: str) -> Optional[str]:
    """Extract text from PDF bytes"""
    if not PDF_AVAILABLE:
        return None
    
    try:
        text_content = []
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        
        for page in pdf_reader.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text_content.append(page_text.strip())
        
        extracted_text = "\n\n".join(text_content)
        
        if len(extracted_text) > 50:
            logger.info(f"PDF text extraction: {len(extracted_text)} chars from {filename}")
            return extracted_text
        
        # Try OCR if text extraction failed
        if PDF2IMAGE_AVAILABLE and OCR_AVAILABLE:
            try:
                images = convert_from_bytes(pdf_bytes, dpi=200)
                ocr_text = []
                for i, image in enumerate(images):
                    page_text = pytesseract.image_to_string(image, lang='eng')
                    if page_text.strip():
                        ocr_text.append(page_text.strip())
                if ocr_text:
                    return "\n\n".join(ocr_text)
            except Exception as e:
                logger.error(f"PDF OCR failed: {e}")
        
        return extracted_text if extracted_text else None
        
    except Exception as e:
        logger.error(f"PDF processing failed for {filename}: {e}")
        return None


def extract_text_from_text_file(file_path: Path) -> Optional[str]:
    """Extract text from plain text files"""
    try:
        # Try UTF-8 first, then fallback encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                text = file_path.read_text(encoding=encoding)
                if text.strip():
                    logger.info(f"Text file loaded: {len(text)} chars from {file_path.name}")
                    return text.strip()
                return None
            except UnicodeDecodeError:
                continue
        
        logger.error(f"Could not decode text file: {file_path.name}")
        return None
        
    except Exception as e:
        logger.error(f"Text file read failed for {file_path.name}: {e}")
        return None


def process_document(file_path: Path) -> Tuple[Optional[str], str]:
    """
    Process any supported document and extract text.
    
    Returns:
        Tuple of (extracted_text, document_type)
        document_type: 'text', 'pdf', 'image', 'ocr_pdf', 'unknown'
    """
    ext = file_path.suffix.lower()
    
    if ext in SUPPORTED_TEXT_EXTENSIONS:
        text = extract_text_from_text_file(file_path)
        return (text, 'text')
    
    elif ext in SUPPORTED_PDF_EXTENSIONS:
        text = extract_text_from_pdf(file_path)
        doc_type = 'pdf' if text else 'unknown'
        return (text, doc_type)
    
    elif ext in SUPPORTED_IMAGE_EXTENSIONS:
        text = extract_text_from_image(file_path)
        return (text, 'image')
    
    else:
        logger.warning(f"Unsupported file type: {ext}")
        return (None, 'unknown')


def process_document_bytes(content: bytes, filename: str, content_type: str) -> Tuple[Optional[str], str]:
    """
    Process document from bytes (for upload handling).
    
    Returns:
        Tuple of (extracted_text, document_type)
    """
    ext = Path(filename).suffix.lower()
    
    # Text files
    if ext in SUPPORTED_TEXT_EXTENSIONS or 'text' in content_type:
        try:
            text = content.decode('utf-8', errors='replace').strip()
            return (text if text else None, 'text')
        except Exception:
            return (None, 'text')
    
    # PDF files
    elif ext in SUPPORTED_PDF_EXTENSIONS or 'pdf' in content_type:
        text = extract_text_from_pdf_bytes(content, filename)
        return (text, 'pdf')
    
    # Image files
    elif ext in SUPPORTED_IMAGE_EXTENSIONS or 'image' in content_type:
        text = extract_text_from_image_bytes(content, filename)
        return (text, 'image')
    
    else:
        logger.warning(f"Unsupported file type: {filename} ({content_type})")
        return (None, 'unknown')


def get_capabilities() -> dict:
    """Return current document processing capabilities"""
    return {
        'text_files': True,
        'pdf_files': PDF_AVAILABLE,
        'pdf_ocr': PDF_AVAILABLE and PDF2IMAGE_AVAILABLE and OCR_AVAILABLE,
        'image_ocr': OCR_AVAILABLE,
        'supported_extensions': list(get_supported_extensions())
    }
