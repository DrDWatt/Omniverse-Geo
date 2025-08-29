#!/bin/bash
set -e

echo "=========================================="
echo "Mac M1 Setup for Omniverse Docker App"
echo "=========================================="
echo ""

# Check if running on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only."
    exit 1
fi

# Check if running on Apple Silicon
if [[ $(uname -m) != "arm64" ]]; then
    echo "⚠️ This script is optimized for Apple Silicon (M1/M2/M3). You may encounter issues on Intel Macs."
fi

echo "🔧 Setting up Mac M1 environment for Omniverse..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install it first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
echo "✅ Homebrew is installed"

# Check for Docker Desktop
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker Desktop..."
    brew install --cask docker
    echo "⚠️ Please start Docker Desktop and enable 'Use Rosetta for x86/amd64 emulation on Apple Silicon'"
    echo "   Go to Docker Desktop > Settings > General > Use Rosetta for x86/amd64 emulation"
    read -p "Press Enter after starting Docker Desktop and enabling Rosetta..."
else
    echo "✅ Docker is installed"
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi
echo "✅ Docker is running"

# Check for XQuartz
if ! [ -d "/Applications/XQuartz.app" ]; then
    echo "❌ XQuartz not found. Installing XQuartz..."
    brew install --cask xquartz
    echo "⚠️ XQuartz installed. Please log out and log back in for it to work properly."
    echo "   Or restart your Mac for best results."
    read -p "Press Enter to continue (you may see X11 errors if you don't restart)..."
else
    echo "✅ XQuartz is installed"
fi

# Start XQuartz if not running
if ! ps aux | grep -v grep | grep -q XQuartz; then
    echo "🚀 Starting XQuartz..."
    open -a XQuartz
    sleep 3
fi

# Set up X11 forwarding for Docker
echo "🔧 Configuring X11 for Docker..."

# Enable X11 forwarding in XQuartz preferences
defaults write org.xquartz.X11 enable_iglx -bool true
defaults write org.xquartz.X11 nolisten_tcp -bool false
defaults write org.xquartz.X11 no_auth -bool false

# Set DISPLAY if not set
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:0
    echo "export DISPLAY=:0" >> ~/.zshrc
fi

# Create X11 auth file
touch /tmp/.docker.xauth
xauth nlist $DISPLAY | sed -e 's/^..../ffff/' | xauth -f /tmp/.docker.xauth nmerge - 2>/dev/null || true

# Set up X11 permissions
xhost +local:docker 2>/dev/null || true
xhost +localhost 2>/dev/null || true
xhost +$(hostname) 2>/dev/null || true

echo ""
echo "✅ Mac M1 setup complete!"
echo ""
echo "📋 Important notes:"
echo "   • Docker Desktop must have 'Use Rosetta for x86/amd64 emulation' enabled"
echo "   • XQuartz must be running before starting the Omniverse app"
echo "   • You may need to restart your Mac if XQuartz was just installed"
echo ""
echo "🚀 You can now run: ./start.sh"
echo ""
