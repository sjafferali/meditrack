#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== MediTrack Container Static Files Update =====${NC}\n"

# Verify docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in your PATH.${NC}"
    exit 1
fi

# Get container name as an argument or prompt for it
CONTAINER_NAME=$1
if [ -z "$CONTAINER_NAME" ]; then
    read -p "Enter the container name (e.g., meditrackgigi): " CONTAINER_NAME
fi

# Check if the container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Container '${CONTAINER_NAME}' does not exist.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 1: Cloning repository...${NC}"
if [ -d "meditrack" ]; then
    echo "Removing existing 'meditrack' directory..."
    rm -rf meditrack
fi

git clone https://github.com/sjafferali/meditrack.git
cd meditrack

echo -e "\n${YELLOW}Step 2: Building frontend...${NC}"
cd frontend
if ! npm ci --legacy-peer-deps; then
    echo -e "${RED}Error installing npm dependencies.${NC}"
    exit 1
fi

if ! npm run build; then
    echo -e "${RED}Error building frontend.${NC}"
    exit 1
fi
cd ..

echo -e "\n${YELLOW}Step 3: Creating temp directory for files...${NC}"
TEMP_DIR=$(mktemp -d)
mkdir -p $TEMP_DIR/app/static
mkdir -p $TEMP_DIR/app/static/static/js

echo -e "\n${YELLOW}Step 4: Copying built files to temp directory...${NC}"
cp -r frontend/build/* $TEMP_DIR/app/static/
cp frontend/public/static/js/person-initializer.js $TEMP_DIR/app/static/static/js/

echo -e "\n${YELLOW}Step 5: Copying files to Docker container...${NC}"
if ! docker cp $TEMP_DIR/app/static/. $CONTAINER_NAME:/app/app/static/; then
    echo -e "${RED}Error copying files to the container.${NC}"
    rm -rf $TEMP_DIR
    exit 1
fi

echo -e "\n${YELLOW}Step 6: Verifying file copy...${NC}"
docker exec $CONTAINER_NAME ls -la /app/app/static/

echo -e "\n${YELLOW}Step 7: Restarting the container...${NC}"
docker restart $CONTAINER_NAME

# Clean up
echo -e "\n${YELLOW}Step 8: Cleaning up...${NC}"
rm -rf $TEMP_DIR

echo -e "\n${GREEN}Update completed successfully!${NC}"
echo -e "The container $CONTAINER_NAME has been updated with the latest frontend files."
echo -e "You should now see the UI improvements in your application."
echo ""
echo -e "${YELLOW}Important notes:${NC}"
echo -e "1. This is a temporary fix. The next time you update your Docker image, you should use the updated GitHub Actions workflow."
echo -e "2. To permanently fix this issue, update your GitHub Actions workflow file with the one from this repository."
echo -e "3. Check the STATIC_FILE_DEPLOYMENT_FIX.md file for more information about the fix."