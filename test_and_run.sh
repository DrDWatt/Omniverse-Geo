#!/bin/bash
set -e

echo "========================================================"
echo "NVIDIA Omniverse Satellite-Orbit - Test & Run"
echo "========================================================"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Allow X11 connections from local Docker containers
echo "Setting up X11 permissions..."
xhost +local:docker

echo "🧪 Running unit tests in container..."
docker run -it --rm \
  -v $PWD:/workspace \
  nvcr.io/nvidia/omniverse/kit-kernel:106.5.0 \
  /opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh \
  --exec "/workspace/run_tests.py"

# Check if tests were successful
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please check the test output for details."
    xhost -local:docker
    exit 1
fi

echo ""
echo "🚀 Tests passed! Starting Omniverse Satellite-Orbit demo..."
echo "   An X11 window should open shortly. If not, check XQuartz settings."
echo "   Press Ctrl+C to stop the application."
echo ""

# Run the Omniverse container with proper settings
docker run -it --rm \
  -e DISPLAY=host.docker.internal:0 \
  -v $PWD:/workspace \
  nvcr.io/nvidia/omniverse/kit-kernel:106.5.0 \
  /opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh \
  --exec /workspace/autoplay.py \
  /workspace/EarthOrbit.usd

# Clean up X11 permissions when done
xhost -local:docker

echo ""
echo "Omniverse demo has exited. Thank you for using the Satellite-Orbit PoC!"
