#!/bin/bash
set -e

echo "========================================================"
echo "NVIDIA Omniverse 'Satellite-Orbit' PoC for Apple Silicon"
echo "========================================================"
echo ""

# Check for prerequisites
echo "Checking prerequisites..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo "✅ Docker is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi
echo "✅ Docker is running"

# Check for XQuartz - more robust check for Mac M1
if ! ps aux | grep -v grep | grep -q XQuartz && ! [ -d "/Applications/XQuartz.app" ] && ! command -v xquartz &> /dev/null; then
    echo "⚠️ XQuartz might not be installed or running."
    echo "   If you have it installed, please start it with: open -a XQuartz"
    echo "   Otherwise install with: brew install --cask xquartz"
    
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ XQuartz check passed"
    # Try to start XQuartz if it's not running
    if ! ps aux | grep -v grep | grep -q XQuartz; then
        echo "⚠️ XQuartz is not running. Attempting to start it..."
        open -a XQuartz &>/dev/null || echo "Could not start XQuartz automatically. Please start it manually."
        sleep 3
    fi
fi

# Set up X11 authentication for Mac M1
echo "Setting up X11 authentication for Mac M1..."
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:0
fi

# Create X11 auth file for Docker
touch /tmp/.docker.xauth
xauth nlist $DISPLAY | sed -e 's/^..../ffff/' | xauth -f /tmp/.docker.xauth nmerge - 2>/dev/null || true

# Check for Omniverse Kit image
if ! docker images | grep -q "nvcr.io/nvidia/omniverse/kit-kerne"; then
    echo "⚠️ Omniverse Kit container image not found. Attempting to pull it..."
    echo "   You may be prompted for your NGC credentials."
    
    # Check if user is logged in to nvcr.io
    if ! docker info | grep -q "nvcr.io"; then
        echo "ℹ️ Please log in to NGC registry:"
        docker login nvcr.io
    fi
    
    # Pull the image
    docker pull nvcr.io/nvidia/omniverse/ov-kit-kernel:106.5.0
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to pull the Omniverse image. Please ensure your NGC credentials are correct."
        exit 1
    fi
fi
echo "✅ Omniverse Kit container image is available"

# Allow X11 connections from local Docker containers - Mac M1 compatible
echo "Setting up X11 permissions for Mac M1..."
xhost +local:docker 2>/dev/null || echo "⚠️ Could not set X11 permissions. You might see display errors."
xhost +localhost 2>/dev/null || true
xhost +$(hostname) 2>/dev/null || true

# Check if USD file exists, if not create it
if [ ! -f "./EarthOrbit.usd" ]; then
    echo "🔨 Creating EarthOrbit.usd scene..."
    docker-compose run --rm scene-creator || {
        # If docker-compose with profiles fails, try direct docker command with Mac M1 support
        docker run -it --rm \
        --platform linux/amd64 \
        -v $PWD:/workspace \
        -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
        -e DISPLAY=${DISPLAY:-:0} \
        -e QT_X11_NO_MITSHM=1 \
        -e XAUTHORITY=/tmp/.docker.xauth \
        -e NVIDIA_VISIBLE_DEVICES=void \
        -e NVIDIA_DRIVER_CAPABILITIES= \
        -e __GLX_VENDOR_LIBRARY_NAME=mesa \
        --network host \
        nvcr.io/nvidia/omniverse/ov-kit-kernel:106.5.0 \
        /opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh \
        --no-window --exec /workspace/create_scene.py
    }
    
    if [ ! -f "./EarthOrbit.usd" ]; then
        echo "❌ Failed to create the USD scene. Please check the error messages above."
        exit 1
    fi
    echo "✅ Scene created successfully"
fi

echo ""
echo "🚀 Starting Omniverse Satellite-Orbit demo..."
echo "   An X11 window should open shortly. If not, check XQuartz settings."
echo "   Press Ctrl+C to stop the application."
echo ""

# Try docker-compose first, fall back to direct docker command if that fails
docker-compose up omniverse-kit || {
    # Run the Omniverse container with proper Mac M1 settings using direct docker command
    docker run -it --rm \
    --platform linux/amd64 \
    -v $PWD:/workspace \
    -v /tmp/.X11-unix:/tmp/.X11-unix:rw \
    -e DISPLAY=${DISPLAY:-:0} \
    -e QT_X11_NO_MITSHM=1 \
    -e XAUTHORITY=/tmp/.docker.xauth \
    -e NVIDIA_VISIBLE_DEVICES=void \
    -e NVIDIA_DRIVER_CAPABILITIES= \
    -e __GLX_VENDOR_LIBRARY_NAME=mesa \
    --network host \
    nvcr.io/nvidia/omniverse/ov-kit-kernel:106.5.0 \
    /opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh \
    --no-window --exec /workspace/autoplay.py \
    /workspace/EarthOrbit.usd
}

# Clean up X11 permissions when done
echo "Cleaning up X11 permissions..."
xhost -local:docker 2>/dev/null || true
xhost -localhost 2>/dev/null || true
xhost -$(hostname) 2>/dev/null || true
rm -f /tmp/.docker.xauth 2>/dev/null || true

echo ""
echo "Omniverse demo has exited. Thank you for trying the Satellite-Orbit PoC!"
