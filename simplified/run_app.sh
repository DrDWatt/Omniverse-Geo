#!/bin/bash
set -e

echo "========================================================"
echo "Satellite-Orbit Visualization - Direct Run"
echo "========================================================"
echo ""

# Check Python installation
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not found"
    exit 1
fi

echo "✅ Python is installed"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔨 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt
pip install httpx pytest requests

# Run the application
echo ""
echo "🚀 Starting Satellite-Orbit visualization app..."
echo "   Open http://localhost:8000 in your browser"
echo "   Press Ctrl+C to stop the application."
echo ""

uvicorn app:app --host 0.0.0.0 --port 8000 --reload
