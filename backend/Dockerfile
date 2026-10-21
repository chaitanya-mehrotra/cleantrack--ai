FROM python:3.11-slim

WORKDIR /app

# Install system deps for Pillow and cryptography
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for uploads and SQLite DB
RUN mkdir -p /app/uploads /app/data

EXPOSE 8000

# Use shell form so $PORT env var expands at runtime
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
