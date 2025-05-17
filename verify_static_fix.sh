#!/bin/bash
# Script to verify the static file fix

echo "Building Docker image..."
docker build -t meditrack:latest .

echo -e "\nStarting container..."
docker compose -f docker-compose.simple.yml up -d

echo -e "\nWaiting for container to start..."
sleep 5

echo -e "\nTesting static file endpoints..."
echo "Testing main page:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/

echo -e "\n\nTesting static JS file:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/static/js/main.8582b399.js

echo -e "\n\nTesting static CSS file:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/static/css/main.48e51c84.css

echo -e "\n\nTesting API health check:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/health

echo -e "\n\nContainer logs:"
docker compose -f docker-compose.simple.yml logs --tail=20

echo -e "\n\nTo stop the container: docker compose -f docker-compose.simple.yml down"