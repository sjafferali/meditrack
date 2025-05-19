#!/bin/bash
# Script to fix static file deployment issues

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== MediTrack Static File Deployment Fix =====${NC}\n"

echo -e "${YELLOW}Step 1: Checking for Docker containers${NC}"
if docker ps | grep -q meditrack; then
  echo -e "${YELLOW}Stopping existing containers...${NC}"
  docker compose -f docker-compose.simple.yml down
fi

echo -e "\n${YELLOW}Step 2: Clear any existing static files${NC}"
if [ -d "backend/app/static" ]; then
  echo "Backing up existing static files..."
  mkdir -p backups
  timestamp=$(date +%Y%m%d%H%M%S)
  tar -czf backups/static_backup_${timestamp}.tar.gz backend/app/static/
  echo "Removing existing static files..."
  rm -rf backend/app/static/*
  mkdir -p backend/app/static/.gitkeep
fi

echo -e "\n${YELLOW}Step 3: Rebuilding frontend${NC}"
echo "Installing frontend dependencies..."
cd frontend
npm ci --legacy-peer-deps
echo "Building frontend..."
npm run build
cd ..

echo -e "\n${YELLOW}Step 4: Copying built files to backend static directory${NC}"
mkdir -p backend/app/static
cp -r frontend/build/* backend/app/static/

# Make sure the person-initializer.js file exists in the static directory
mkdir -p backend/app/static/static/js
if [ -f "frontend/public/static/js/person-initializer.js" ]; then
  echo "Copying person-initializer.js..."
  cp frontend/public/static/js/person-initializer.js backend/app/static/static/js/
else
  echo -e "${RED}Warning: person-initializer.js not found in frontend/public/static/js/${NC}"
fi

echo -e "\n${YELLOW}Step 5: Building Docker image without using volumes for static files${NC}"
echo "Building Docker image..."
docker build -t meditrack:latest .

echo -e "\n${YELLOW}Step 6: Creating docker-compose.production.yml without static volume mounts${NC}"
cat > docker-compose.production.yml << EOF
services:
  meditrack:
    image: meditrack:latest
    ports:
      - "8080:8000"
    volumes:
      - ./data:/app/data
    environment:
      DATABASE_URL: sqlite:///./data/meditrack.db
      SECRET_KEY: your-secret-key-here-change-in-production
    restart: unless-stopped
EOF

echo -e "\n${YELLOW}Step 7: Starting container with production configuration${NC}"
docker compose -f docker-compose.production.yml up -d

echo -e "\n${YELLOW}Step 8: Verifying deployment${NC}"
echo "Waiting for service to start..."
sleep 5

# Test endpoints
echo "Testing static file access..."
MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$MAIN_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ Main page is accessible (HTTP 200)${NC}"
else
  echo -e "${RED}✗ Main page returned HTTP $MAIN_STATUS${NC}"
fi

# Get the name of the JS file from index.html
JS_FILE=$(grep -o 'static/js/main.[a-z0-9]*.js' backend/app/static/index.html | head -1)
if [ -n "$JS_FILE" ]; then
  JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/$JS_FILE")
  if [ "$JS_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ JavaScript file is accessible (HTTP 200)${NC}"
  else
    echo -e "${RED}✗ JavaScript file returned HTTP $JS_STATUS${NC}"
  fi
else
  echo -e "${RED}✗ Couldn't determine JS filename from index.html${NC}"
fi

API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/health)
if [ "$API_STATUS" = "200" ]; then
  echo -e "${GREEN}✓ API health endpoint is accessible (HTTP 200)${NC}"
else
  echo -e "${RED}✗ API health endpoint returned HTTP $API_STATUS${NC}"
fi

echo -e "\n${GREEN}Deployment fix completed!${NC}"
echo -e "The application should now be accessible at http://localhost:8080\n"
echo -e "${YELLOW}Important notes:${NC}"
echo -e "1. We've created a new docker-compose.production.yml file that doesn't mount static files"
echo -e "2. Always use this file for production deployments: docker compose -f docker-compose.production.yml up -d"
echo -e "3. For development, continue using docker-compose.simple.yml or start_dev.sh"
echo -e "4. If you need to update frontend code, rebuild the Docker image completely"

echo -e "\n${YELLOW}To stop the container:${NC}"
echo -e "docker compose -f docker-compose.production.yml down"