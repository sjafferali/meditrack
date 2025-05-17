#!/bin/bash
set -e

echo "🚀 Running essential CI checks..."

# Backend Tests
echo "Running backend tests..."
docker run --rm -v $(pwd)/backend:/app meditrack:latest pytest -v

# Backend Linting
echo "Running backend linters..."
docker run --rm -v $(pwd)/backend:/app meditrack:latest black --check .
docker run --rm -v $(pwd)/backend:/app meditrack:latest isort --check-only .
docker run --rm -v $(pwd)/backend:/app meditrack:latest flake8 .
docker run --rm -v $(pwd)/backend:/app meditrack:latest mypy app/ --ignore-missing-imports

# Frontend Tests
echo "Running frontend tests..."
cd frontend
npm test -- --watchAll=false

echo "✅ All essential CI checks passed!"