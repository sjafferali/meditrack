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
echo "To run in production mode:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "To run in development mode:"
echo "  docker-compose up"