#!/bin/bash

# Album Tracker - Deployment Script
# This script helps deploy the Album Tracker application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "  Album Tracker - Deployment Script"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env and set MUSIC_LIBRARY_PATH before continuing${NC}"
    echo ""
    read -p "Press Enter to open .env in nano (or Ctrl+C to exit)..."
    nano .env
fi

# Verify MUSIC_LIBRARY_PATH is set
source .env
if [ -z "$MUSIC_LIBRARY_PATH" ]; then
    echo -e "${RED}Error: MUSIC_LIBRARY_PATH is not set in .env${NC}"
    exit 1
fi

if [ ! -d "$MUSIC_LIBRARY_PATH" ]; then
    echo -e "${RED}Error: Music library path does not exist: $MUSIC_LIBRARY_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration verified${NC}"
echo ""

# Build and start services
echo "Building Docker images..."
docker-compose build

echo ""
echo "Starting services..."
docker-compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 5

# Check service health
BACKEND_HEALTHY=false
FRONTEND_HEALTHY=false

for i in {1..30}; do
    if docker-compose ps | grep backend | grep -q "healthy"; then
        BACKEND_HEALTHY=true
    fi
    if docker-compose ps | grep frontend | grep -q "healthy"; then
        FRONTEND_HEALTHY=true
    fi

    if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
        break
    fi

    echo -n "."
    sleep 2
done

echo ""
echo ""

if [ "$BACKEND_HEALTHY" = true ] && [ "$FRONTEND_HEALTHY" = true ]; then
    echo -e "${GREEN}========================================="
    echo "  Deployment Successful!"
    echo "=========================================${NC}"
    echo ""
    echo "Frontend: http://localhost:8175"
    echo "Backend:  http://localhost:3035"
    echo ""
    echo "View logs: docker-compose logs -f"
    echo "Stop:      docker-compose down"
    echo ""
else
    echo -e "${YELLOW}Warning: Services may not be fully healthy yet${NC}"
    echo "Check status: docker-compose ps"
    echo "View logs:    docker-compose logs"
fi
