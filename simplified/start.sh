#!/bin/bash
set -e

echo "========================================================"
echo "Satellite-Orbit Visualization - Docker on M1 Demo"
echo "========================================================"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop"
    exit 1
fi

echo "✅ Docker is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Build the Docker image
echo "🔨 Building Docker image..."
docker-compose build

# Run the tests directly in the container
echo ""
echo "🧪 Running tests..."
docker run --rm -v "$PWD:/app" simplified-app sh -c "pip install --no-cache-dir httpx pytest-cov requests pytest fastapi && cd /app && python -m pytest tests/"

# If tests pass, start the application
if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Starting Satellite-Orbit visualization app..."
    echo "   Open http://localhost:8000 in your browser"
    echo "   Press Ctrl+C to stop the application."
    echo ""

    docker-compose up app
else
    echo ""
    echo "❌ Tests failed. Please fix the issues before running the application."
    exit 1
fi
