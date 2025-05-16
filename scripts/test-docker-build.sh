#!/bin/bash

# Test Docker builds locally

echo "Building backend Docker image..."
cd backend
docker build -t meditrack-backend:test . || { echo "Backend build failed"; exit 1; }
cd ..

echo "Building frontend Docker image..."
cd frontend
docker build -t meditrack-frontend:test . || { echo "Frontend build failed"; exit 1; }
cd ..

echo "✅ Both Docker images built successfully!"
echo ""
echo "Images created:"
docker images | grep meditrack | grep test