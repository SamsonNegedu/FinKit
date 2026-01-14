#!/bin/bash
set -e

# Transaction Analyser Deployment Script for Raspberry Pi
# Usage: ./deploy.sh [--pull-only]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Transaction Analyser Deployment${NC}"
echo "=================================="

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${RED}Please edit .env with your API keys before running again${NC}"
        exit 1
    fi
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Login to GitHub Container Registry (if needed)
if [ -n "$GITHUB_TOKEN" ]; then
    echo -e "${GREEN}Logging in to GitHub Container Registry...${NC}"
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
fi

# Pull latest images
echo -e "${GREEN}Pulling latest images...${NC}"
docker compose -f docker-compose.prod.yml pull

if [ "$1" == "--pull-only" ]; then
    echo -e "${GREEN}✅ Images pulled successfully${NC}"
    exit 0
fi

# Stop existing containers
echo -e "${GREEN}Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml down || true

# Start new containers
echo -e "${GREEN}Starting containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for health checks
echo -e "${GREEN}Waiting for services to be healthy...${NC}"
sleep 10

# Check status
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo -e "Access the app at: ${GREEN}http://$(hostname -I | awk '{print $1}')${NC}"
