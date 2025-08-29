#!/bin/bash
set -e

echo "========================================================"
echo "NVIDIA Omniverse Satellite-Orbit - Headless Tests"
echo "========================================================"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "🧪 Running unit tests in container (headless mode)..."
# Run tests directly with docker instead of docker-compose
docker run -it --rm \
  -v $PWD:/workspace \
  nvcr.io/nvidia/omniverse/kit-kernel:106.5.0 \
  /opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh \
  --exec "/workspace/run_tests.py"

# Check if tests were successful
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please check the test output for details."
    exit 1
fi

echo ""
echo "✅ Tests passed successfully!"
echo ""
echo "To run the full application with visualization, please install XQuartz:"
echo "  brew install --cask xquartz"
echo "  (After installation, log out and log back in to complete setup)"
echo ""
echo "Then run the application with:"
echo "  ./start.sh"
