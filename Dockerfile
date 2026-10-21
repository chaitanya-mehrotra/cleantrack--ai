FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ /app/

# Ensure runtime directories exist
RUN mkdir -p /app/uploads /app/data

EXPOSE 8000

# Run uvicorn on dynamic port assigned by hosting provider
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
