#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Running comprehensive CI checks locally..."

# Function to print section headers
print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Backend Tests
print_header "Backend Tests"
cd backend
if python -m pytest -v --cov=app --cov-report=xml --cov-report=term-missing; then
    print_success "Backend tests passed"
else
    print_error "Backend tests failed"
    exit 1
fi
cd ..

# Frontend Tests  
print_header "Frontend Tests"
cd frontend
if npm run test:coverage -- --ci --watchAll=false; then
    print_success "Frontend tests passed"
else
    print_error "Frontend tests failed"
    exit 1
fi
cd ..

# Backend Linting - Black
print_header "Backend Linting - Black"
cd backend
if black --check .; then
    print_success "Black check passed"
else
    print_error "Black check failed - run 'black .' to fix"
    exit 1
fi
cd ..

# Backend Linting - isort
print_header "Backend Linting - isort"
cd backend
if isort --check-only .; then
    print_success "isort check passed"
else
    print_error "isort check failed - run 'isort .' to fix"
    exit 1
fi
cd ..

# Backend Linting - Flake8
print_header "Backend Linting - Flake8"
cd backend
if flake8 .; then
    print_success "Flake8 check passed"
else
    print_error "Flake8 check failed"
    exit 1
fi
cd ..

# Backend Linting - MyPy
print_header "Backend Linting - MyPy"
cd backend
if mypy app/ --ignore-missing-imports; then
    print_success "MyPy check passed"
else
    print_error "MyPy check failed"
    exit 1
fi
cd ..

# Frontend Linting - ESLint
print_header "Frontend Linting - ESLint"
cd frontend
if npm run lint; then
    print_success "ESLint check passed"
else
    print_error "ESLint check failed"
    # Don't exit on ESLint errors for now (matching CI behavior)
fi
cd ..

# Frontend TypeScript Check
print_header "Frontend TypeScript Check"
cd frontend
if npx tsc --noEmit --project tsconfig.json; then
    print_success "TypeScript check passed"
else
    print_error "TypeScript check failed"
    # Don't exit on TS errors for now (matching CI behavior)
fi
cd ..

# Security Scanning - Python
print_header "Security Scanning - Python Dependencies"
cd backend
pip install safety >/dev/null 2>&1
if safety check -r requirements.txt --json; then
    print_success "Python dependency security check passed"
else
    print_error "Python dependency security check failed"
    # Don't exit on security errors (matching CI behavior)
fi
cd ..

# Security Scanning - npm
print_header "Security Scanning - npm Dependencies"
cd frontend
if npm audit; then
    print_success "npm security check passed"
else
    print_error "npm security check found vulnerabilities"
    # Don't exit on security errors (matching CI behavior)
fi
cd ..

# Docker Build Test
print_header "Docker Build Test"
if docker build -t meditrack:test .; then
    print_success "Docker build succeeded"
else
    print_error "Docker build failed"
    exit 1
fi

# Summary
print_header "Summary"
echo -e "${GREEN}All critical CI checks passed! ✓${NC}"
echo -e "\n${YELLOW}Note: Some non-critical checks may have warnings:${NC}"
echo "- ESLint warnings (if any) don't fail the CI"
echo "- TypeScript errors (if any) don't fail the CI"
echo "- Security vulnerabilities (if any) are reported but don't fail the CI"
echo -e "\n${GREEN}You're ready to commit and push! 🎉${NC}"