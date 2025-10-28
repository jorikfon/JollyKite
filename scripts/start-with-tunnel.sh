#!/bin/bash

# JollyKite - Start development servers with LocalXpose tunnel
# This script starts both frontend and backend, then creates a public tunnel

set -e

echo "🚀 Starting JollyKite with LocalXpose tunnel..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables from .env if it exists
if [ -f .env ]; then
    echo -e "${BLUE}📄 Loading .env file...${NC}"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if loclx is installed
if ! command -v loclx &> /dev/null; then
    echo -e "${YELLOW}⚠️  LocalXpose (loclx) is not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  macOS: brew install localxpose"
    echo "  or download from: https://localxpose.io/download"
    echo ""
    exit 1
fi

# Check if user is logged in to LocalXpose or has token in .env
if [ -n "$LX_ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓ Using LX_ACCESS_TOKEN from .env${NC}"
    export LOCLX_ACCESS_TOKEN="$LX_ACCESS_TOKEN"
elif ! loclx account info &> /dev/null; then
    echo -e "${YELLOW}⚠️  You need to login to LocalXpose${NC}"
    echo ""
    echo "Option 1: Add LX_ACCESS_TOKEN to .env file"
    echo "Option 2: Run: loclx account login"
    echo ""
    echo "Get your token from: https://localxpose.io/"
    echo ""
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"

    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null

    # Stop LocalXpose tunnels
    loclx tunnel stop --all 2>/dev/null || true

    echo -e "${GREEN}✓ Services stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Start backend
echo -e "${BLUE}📦 Starting backend (port 3000)...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend with Python HTTP server
echo -e "${BLUE}🌐 Starting frontend (port 8080)...${NC}"
python3 -m http.server 8080 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 2

# Create tunnel using config file
echo -e "${BLUE}🔗 Creating LocalXpose tunnels...${NC}"
echo ""

# Start tunnels in background
loclx tunnel --config loclx.yml &
TUNNEL_PID=$!

# Wait a bit for tunnels to establish
sleep 3

# Show active tunnels
echo ""
echo -e "${GREEN}✅ JollyKite is running!${NC}"
echo ""
echo "Services:"
echo "  📦 Backend:  http://localhost:3000"
echo "  🌐 Frontend: http://localhost:8080"
echo ""
echo -e "${GREEN}Public URLs (from LocalXpose):${NC}"
loclx account tunnels 2>/dev/null || echo "  Run 'loclx account tunnels' to see public URLs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for user to stop
wait
