# Enterprise-Grade Backend Construction
FROM python:3.11-slim-bookworm

# Install System Dependencies (OCR & PDF processing)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Application logic
COPY . .

# Set persistent storage volume
RUN mkdir -p /app/qdrant_db
VOLUME /app/qdrant_db

EXPOSE 8001

# Production-grade entry point
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4"]
