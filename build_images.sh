#!/bin/bash

echo "Building MediTrack Docker images..."

# Build backend image
echo "Building backend image..."
docker build -t meditrack-backend:latest ./backend

# Build frontend image
echo "Building frontend image..."
docker build -t meditrack-frontend:latest ./frontend

echo "Docker images built successfully!"
echo ""
echo "To run the application:"
echo "  With SQLite: docker-compose -f docker-compose.simple.yml up -d"
echo "  With PostgreSQL: docker-compose -f docker-compose.postgres.yml up -d"