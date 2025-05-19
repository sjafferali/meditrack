# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
# Build with relative API URL
ENV REACT_APP_API_URL=/api/v1
RUN npm run build

# Stage 2: Build backend with frontend
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy frontend build into static directory
COPY --from=frontend-build /app/build ./app/static

# Ensure the static/js directory exists
RUN mkdir -p ./app/static/static/js

# Copy person-initializer.js from frontend to ensure it exists
COPY frontend/public/static/js/person-initializer.js ./app/static/static/js/

# Create data directory
RUN mkdir -p /app/data

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
