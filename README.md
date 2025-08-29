# NVIDIA Omniverse "Satellite-Orbit" PoC for Apple Silicon

This project demonstrates a simplified Omniverse application running on Apple Silicon (M1/M2/M3) Macs using Docker and Rosetta 2 emulation.

## Prerequisites

| Requirement | Purpose | Installation |
|-------------|---------|--------------|
| Docker Desktop ≥ 4.29 | Runs x86_64 containers under Rosetta/QEMU | [Download](https://www.docker.com/products/docker-desktop) |
| XQuartz | Local X-server so the container can open a window | `brew install --cask xquartz` (requires logout/login) |
| NGC account + API key | Needed to pull NVIDIA Omniverse images | [Register at NGC](https://ngc.nvidia.com) |

## Setup Instructions

1. **Configure Docker Desktop**
   - Open Docker Desktop
   - Go to Settings → Features in development
   - Enable "Use Rosetta for x86/amd64 emulation"

2. **Pull the Omniverse Kit container**
   ```bash
   docker login nvcr.io  # Enter your NGC credentials
   docker pull nvcr.io/nvidia/omniverse/kit-kernel:106.5.0
   ```

3. **Start XQuartz**
   - Launch XQuartz from your Applications folder
   - Go to XQuartz → Preferences → Security
   - Check "Allow connections from network clients"
   - Restart XQuartz

## Project Structure

- `assets/` - Contains 3D model files
  - `earth.glb` - Textured Earth sphere
  - `satellite.glb` - Low-poly satellite model
- `EarthOrbit.usd` - USD scene with Earth and orbiting satellite
- `autoplay.py` - Script to automatically play the animation timeline
- `run.sh` - Helper script to launch the Omniverse container

## Running the Demo

1. Open a terminal and navigate to this project folder
2. Make sure XQuartz is running
3. Execute the run script:
   ```bash
   ./run.sh
   ```

The Omniverse viewport will open, showing Earth with a satellite in orbit. The animation will automatically play in a continuous loop.

## Technical Details

- The scene renders using CPU-only mode (no GPU acceleration)
- Animation plays at 24fps with a 10-second loop (240 frames)
- Earth is positioned at origin (0,0,0)
- Satellite orbits around the Y-axis at a distance of ~6800 km (scaled)

## Troubleshooting

- If the window doesn't appear, check that XQuartz is running and properly configured
- For "Cannot connect to X server" errors, try restarting XQuartz and verify its security settings
- If Docker fails to pull the image, verify your NGC credentials and network connectivity
