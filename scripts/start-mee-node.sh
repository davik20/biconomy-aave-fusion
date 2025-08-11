#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting MEE Node${NC}"
echo "================================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}.env file not found${NC}"
    echo "Please create a .env file with your configuration"
    exit 1
fi

# Check if Anvil is running
if ! curl -s http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Anvil doesn't seem to be running on port 8545${NC}"
    echo "Make sure to start Anvil first with: ./scripts/start-anvil.sh"
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Stop any existing containers
echo -e "${YELLOW}Stopping any existing containers...${NC}"
docker compose down 2>/dev/null

# Start MEE Node
echo -e "${GREEN}Starting MEE Node with Docker Compose...${NC}"
docker compose up -d

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 5

# Check if containers are running
if docker compose ps | grep -q "Up"; then
    echo -e "${GREEN}MEE Node containers are running${NC}"
    echo ""
    echo "Services:"
    docker compose ps
    echo ""
    
    # Wait a bit more for the node to fully initialize
    sleep 3
    
    # Check MEE Node status
    echo "Checking MEE Node status..."
    if curl -s http://localhost:3000/v3/info > /dev/null 2>&1; then
        echo -e "${GREEN}MEE Node is responding at http://localhost:3000${NC}"
        echo ""
        echo "Node Info:"
        curl -s http://localhost:3000/v3/info | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3000/v3/info
    else
        echo -e "${YELLOW}MEE Node is not yet responding. It may still be initializing.${NC}"
        echo "Check logs with: docker compose logs node"
    fi
else
    echo -e "${RED}Failed to start MEE Node containers${NC}"
    echo "Check logs with: docker compose logs"
    exit 1
fi

echo ""
echo "================================================"
echo -e "${GREEN}MEE Node Setup Complete!${NC}"
echo ""
echo "Useful commands:"
echo "  Check logs:     docker compose logs -f"
echo "  Stop services:  docker compose down"
echo "  Node status:    curl http://localhost:3000/v3/info"
echo "================================================" 