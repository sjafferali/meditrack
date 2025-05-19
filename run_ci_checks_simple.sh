#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Running CI checks (PR workflow)..."

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
print_header "Installing backend dependencies"
cd backend
pip install --upgrade pip
pip install -r requirements.txt
pip install black isort flake8 mypy
cd ..

# Backend Tests (no coverage for PR checks)
print_header "Backend Tests"
cd backend
if python -m pytest -v; then
    echo -e "${GREEN}✓ Backend tests passed${NC}"
else
    echo -e "${RED}✗ Backend tests failed${NC}"
    deactivate
    exit 1
fi
cd ..

# Frontend Tests (no coverage for PR checks)
print_header "Frontend Tests"
cd frontend
if npm test -- --coverage=false --watchAll=false; then
    echo -e "${GREEN}✓ Frontend tests passed${NC}"
else
    echo -e "${RED}✗ Frontend tests failed${NC}"
    deactivate
    exit 1
fi
cd ..

# Backend Linting - Black
print_header "Backend Linting - Black"
cd backend
if black --check app/; then
    echo -e "${GREEN}✓ Black check passed${NC}"
else
    echo -e "${RED}✗ Black check failed - run 'black app/' to fix${NC}"
    deactivate
    exit 1
fi
cd ..

# Backend Linting - isort
print_header "Backend Linting - isort"
cd backend
if isort --check-only app/; then
    echo -e "${GREEN}✓ isort check passed${NC}"
else
    echo -e "${RED}✗ isort check failed - run 'isort app/' to fix${NC}"
    deactivate
    exit 1
fi
cd ..

# Backend Linting - Flake8
print_header "Backend Linting - Flake8"
cd backend
if flake8 app/ --max-line-length=88; then
    echo -e "${GREEN}✓ Flake8 check passed${NC}"
else
    echo -e "${RED}✗ Flake8 check failed${NC}"
    deactivate
    exit 1
fi
cd ..

# Backend Linting - MyPy
print_header "Backend Linting - MyPy"
cd backend
if mypy app/ --ignore-missing-imports; then
    echo -e "${GREEN}✓ MyPy check passed${NC}"
else
    echo -e "${RED}✗ MyPy check failed${NC}"
    deactivate
    exit 1
fi
cd ..

# Frontend Linting - ESLint
print_header "Frontend Linting - ESLint"
cd frontend
if npm run lint; then
    echo -e "${GREEN}✓ ESLint check passed${NC}"
else
    echo -e "${RED}✗ ESLint check failed${NC}"
    # Don't exit on ESLint errors for now (matching CI behavior)
fi
cd ..

# Frontend TypeScript Check
print_header "Frontend TypeScript Check"
cd frontend
if npm run type-check || true; then
    echo -e "${GREEN}✓ TypeScript check completed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript check has errors (allowed to fail)${NC}"
fi
cd ..

# Docker Build Test
print_header "Docker Build Test"
if docker build -t meditrack:test .; then
    echo -e "${GREEN}✓ Docker build succeeded${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    deactivate
    exit 1
fi

# Deactivate virtual environment
deactivate

# Summary
print_header "Summary"
echo -e "${GREEN}All critical CI checks passed! ✓${NC}"
echo -e "\n${YELLOW}Note: Some checks are configured to warn but not fail:${NC}"
echo "- ESLint warnings don't fail the CI"
echo "- TypeScript errors don't fail the CI"
echo -e "\n${GREEN}Ready for PR! 🎉${NC}"