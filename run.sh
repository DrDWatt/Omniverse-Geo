#!/bin/bash

# Allow X11 from containers
xhost +local:docker

# Check if USD file exists, if not create it first
if [ ! -f "./EarthOrbit.usd" ]; then
  echo "Creating EarthOrbit.usd scene..."
  docker run -it --rm \
    -v $PWD:/workspace \
    nvcr.io/nvidia/omniverse/kit-kernel:106.5.0 \
    /opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh \
    --exec /workspace/create_scene.py
fi

# Run the Omniverse container with proper settings
echo "Starting Omniverse viewer..."
docker run -it --rm \
  -e DISPLAY=host.docker.internal:0 \
  -v $PWD:/workspace \
  nvcr.io/nvidia/omniverse/kit-kernel:106.5.0 \
  /opt/nvidia/omniverse/kit-kernel/startup_nogpu.sh \
  --exec /workspace/autoplay.py \
  /workspace/EarthOrbit.usd
