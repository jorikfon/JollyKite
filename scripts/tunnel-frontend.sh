#!/bin/bash

# Quick script to create LocalXpose tunnel to frontend only
# Assumes frontend is already running on port 8080

set -e

echo "🔗 Creating LocalXpose tunnel to frontend (port 8080)..."
echo ""

# Check if loclx is installed
if ! command -v loclx &> /dev/null; then
    echo "⚠️  LocalXpose (loclx) is not installed"
    echo "Install: brew install localxpose"
    exit 1
fi

# Check if frontend is running
if ! lsof -i :8080 &> /dev/null; then
    echo "⚠️  Frontend is not running on port 8080"
    echo ""
    echo "Start it with:"
    echo "  python3 -m http.server 8080"
    echo "  or"
    echo "  npx http-server -p 8080"
    exit 1
fi

echo "✓ Frontend detected on port 8080"
echo ""

# Create tunnel
echo "Creating tunnel..."
loclx tunnel http --to localhost:8080

# Note: This will run until Ctrl+C
