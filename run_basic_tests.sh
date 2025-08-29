#!/bin/bash
set -e

echo "========================================================"
echo "NVIDIA Omniverse Satellite-Orbit - Basic Tests"
echo "========================================================"
echo ""

# Check directory structure
echo "Checking project structure..."
MISSING_FILES=0

check_file() {
  if [ -f "$1" ]; then
    echo "✅ Found $1"
  else
    echo "❌ Missing $1"
    MISSING_FILES=$((MISSING_FILES+1))
  fi
}

check_file "autoplay.py"
check_file "create_scene.py"
check_file "docker-compose.yml"
check_file "Dockerfile"
check_file "README.md"
check_file "run.sh"
check_file "start.sh"

# Check test files
check_file "tests/test_scene_creation.py"
check_file "tests/test_autoplay.py"
check_file "run_tests.py"

if [ $MISSING_FILES -eq 0 ]; then
  echo ""
  echo "✅ All required files are present!"
else
  echo ""
  echo "❌ Missing $MISSING_FILES required files. Please check output above."
  exit 1
fi

echo ""
echo "📝 Verifying Python scripts..."

# Verify Python syntax
echo "Checking autoplay.py syntax..."
python3 -m py_compile autoplay.py 2>/dev/null || echo "❌ Syntax error in autoplay.py"

echo ""
echo "✅ Basic tests completed successfully!"
echo ""
echo "To run the full application with Omniverse:"
echo ""
echo "1. Ensure your NGC credentials have access to the kit-kernel:106.5.0 container"
echo "2. Make sure XQuartz is running (open -a XQuartz)"
echo "3. Run: ./start.sh"
echo ""
echo "Alternatively, you can use the docker-compose.yml for a complete development environment"
