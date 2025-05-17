#!/bin/bash
set -e

echo "🚀 Running essential CI checks..."

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Backend Tests
echo "Running backend tests..."
pytest -v

# Backend Linting
echo "Running backend linters..."
black --check --exclude='venv|migrations|frontend' .
isort --check-only --skip-glob='venv/*' --skip-glob='migrations/*' --skip-glob='frontend/*' .
flake8 app/ tests/ scripts/
mypy app/ --ignore-missing-imports

cd ..

# Frontend Tests
echo "Running frontend tests..."
cd frontend
npm test -- --watchAll=false

cd ..

# Deactivate virtual environment
deactivate

echo "✅ All essential CI checks passed!"