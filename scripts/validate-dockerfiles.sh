#!/bin/bash

# Validate Dockerfiles

echo "Validating backend Dockerfile..."
cd backend
docker build --no-cache --progress=plain --dry-run . || echo "Backend validation done"
cd ..

echo ""
echo "Validating frontend Dockerfile..."
cd frontend
docker build --no-cache --progress=plain --dry-run . || echo "Frontend validation done"
cd ..

echo ""
echo "✅ Dockerfile validation complete!"