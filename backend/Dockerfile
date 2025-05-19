# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /frontend
COPY ../frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY ../frontend/ ./
# Build with relative API URL
ENV REACT_APP_API_URL=/api/v1
RUN npm run build

# Stage 2: Build backend with frontend
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy frontend build into static directory
COPY --from=frontend-build /frontend/build ./app/static

# Ensure person-initializer.js exists in the static directory
COPY ../frontend/public/static/js/person-initializer.js ./app/static/static/js/

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]