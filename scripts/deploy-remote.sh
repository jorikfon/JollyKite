#!/bin/bash
# JollyKite Remote Deployment Script
# Downloads and deploys JollyKite using Docker

set -e  # Exit on error

GITHUB_REPO="jorikfon/JollyKite"
GITHUB_BRANCH="docker-containerization"
BASE_URL="https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}"

echo "🚀 JollyKite Deployment Script"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed"
    echo "Please install docker-compose first"
    exit 1
fi

echo "✓ Docker found: $(docker --version)"
echo "✓ Docker Compose found: $(docker-compose --version)"
echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p backend/data
mkdir -p css
mkdir -p js/utils
mkdir -p icons
mkdir -p images
echo "✓ Directories created"
echo ""

# Download configuration files
echo "📥 Downloading configuration files..."
curl -sS -o docker-compose.prod.yml "${BASE_URL}/docker-compose.prod.yml"
curl -sS -o nginx.conf "${BASE_URL}/nginx.conf"
curl -sS -o .env.example "${BASE_URL}/.env.example"
echo "✓ Configuration files downloaded"
echo ""

# Download frontend files
echo "📥 Downloading frontend files..."
curl -sS -o index.html "${BASE_URL}/index.html"
curl -sS -o manifest.json "${BASE_URL}/manifest.json"
curl -sS -o sw.js "${BASE_URL}/sw.js"
curl -sS -o kiter.png "${BASE_URL}/kiter.png"
echo "✓ Frontend HTML files downloaded"
echo ""

# Download CSS
echo "📥 Downloading CSS..."
curl -sS -o css/main.css "${BASE_URL}/css/main.css"
echo "✓ CSS downloaded"
echo ""

# Download JavaScript files
echo "📥 Downloading JavaScript files..."
curl -sS -o js/App.js "${BASE_URL}/js/App.js"
curl -sS -o js/config.js "${BASE_URL}/js/config.js"
curl -sS -o js/WindDataManager.js "${BASE_URL}/js/WindDataManager.js"
curl -sS -o js/WindStreamManager.js "${BASE_URL}/js/WindStreamManager.js"
curl -sS -o js/MapController.js "${BASE_URL}/js/MapController.js"
curl -sS -o js/ForecastManager.js "${BASE_URL}/js/ForecastManager.js"
curl -sS -o js/WindArrowController.js "${BASE_URL}/js/WindArrowController.js"
curl -sS -o js/HistoryManager.js "${BASE_URL}/js/HistoryManager.js"
curl -sS -o js/WindStatistics.js "${BASE_URL}/js/WindStatistics.js"
curl -sS -o js/WindHistoryDisplay.js "${BASE_URL}/js/WindHistoryDisplay.js"
curl -sS -o js/NotificationManager.js "${BASE_URL}/js/NotificationManager.js"
curl -sS -o js/KiteSizeRecommendation.js "${BASE_URL}/js/KiteSizeRecommendation.js"
curl -sS -o js/utils/WindUtils.js "${BASE_URL}/js/utils/WindUtils.js"
curl -sS -o js/utils/KiteSizeCalculator.js "${BASE_URL}/js/utils/KiteSizeCalculator.js"
echo "✓ JavaScript files downloaded"
echo ""

# Download images
echo "📥 Downloading images..."
curl -sS -o images/map-background.png "${BASE_URL}/images/map-background.png" 2>/dev/null || echo "⚠ Warning: map-background.png not found"
echo "✓ Images downloaded"
echo ""

# Setup .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✓ .env file created (edit if needed for tunnel)"
    echo ""
fi

# Pull Docker images
echo "🐳 Pulling Docker images..."
docker-compose -f docker-compose.prod.yml pull
echo "✓ Docker images pulled"
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d
echo "✓ Services started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check services
echo "🔍 Checking services status..."
docker-compose -f docker-compose.prod.yml ps
echo ""

# Test backend
echo "🧪 Testing backend API..."
if curl -sS -f http://localhost:3000/api/wind/current > /dev/null; then
    echo "✓ Backend API is responding"
else
    echo "⚠ Warning: Backend API not responding yet (may need more time to start)"
fi
echo ""

# Show logs
echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=10
echo ""

echo "================================"
echo "✅ Deployment completed!"
echo ""
echo "Your JollyKite application is running:"
echo "  🌐 Frontend: http://localhost"
echo "  🔌 Backend API: http://localhost:3000/api"
echo ""
echo "Useful commands:"
echo "  View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Stop: docker-compose -f docker-compose.prod.yml down"
echo "  Restart: docker-compose -f docker-compose.prod.yml restart"
echo "  Update: docker-compose -f docker-compose.prod.yml pull && docker-compose -f docker-compose.prod.yml up -d"
echo ""
