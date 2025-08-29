#!/bin/bash
set -e

echo "Installing test dependencies..."
pip install httpx requests pytest-cov fastapi pytest

echo "Verifying dependencies are installed..."
pip list | grep httpx
pip list | grep fastapi
pip list | grep pytest

echo "Running tests..."
python -m pytest tests/ -v
