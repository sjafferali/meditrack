#!/bin/bash

echo "Building MediTrack Docker images..."

# Build frontend first
echo "Building frontend..."
cd frontend
npm ci --legacy-peer-deps
npm run build
cd ..

# Create static directory in backend if it doesn't exist
mkdir -p backend/app/static

# Copy frontend build to backend static directory
echo "Copying frontend build to backend static directory..."
cp -r frontend/build/* backend/app/static/

# Build combined image
echo "Building combined meditrack image..."
docker build -t meditrack:latest ./backend

echo "Docker image built successfully!"
echo ""
echo "To run the application:"
echo "  With SQLite: docker compose -f docker-compose.simple.yml up -d"
echo "  With PostgreSQL: docker compose -f docker-compose.postgres.yml up -d"