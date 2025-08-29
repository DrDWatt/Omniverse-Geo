#!/usr/bin/env python3
"""
Satellite-Orbit Visualization - FastAPI Backend
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional, Tuple

import numpy as np
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Satellite-Orbit Visualization",
    description="Web-based visualization of Earth with a satellite in orbit",
    version="1.0.0"
)

# Mount static files
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
    logger.info("Static files mounted successfully")
except Exception as e:
    logger.error(f"Failed to mount static files: {e}")
    # We'll continue without static files and let FastAPI handle the 404s

# Create templates
try:
    templates = Jinja2Templates(directory="templates")
    logger.info("Templates initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize templates: {e}")
    raise

# Define model interfaces
class OrbitDataGenerator:
    """Interface for orbit data generation"""
    
    def generate_data(self, frames: int, radius: float) -> Dict[str, Any]:
        """Generate orbit data with the given parameters"""
        raise NotImplementedError("Subclasses must implement this method")

class CircularOrbitGenerator(OrbitDataGenerator):
    """Implementation of a circular orbit data generator"""
    
    def generate_data(self, frames: int = 240, radius: float = 6800) -> Dict[str, Any]:
        """Generate Earth and satellite orbit position data for a circular orbit"""
        data = {
            "earth": {
                "position": [0, 0, 0],
                "radius": 6371  # Earth radius in km
            },
            "satellite": {
                "positions": []
            },
            "hubble": {
                "positions": [],
                "info": {
                    "name": "Hubble Space Telescope",
                    "launch_date": "April 24, 1990",
                    "orbit_height": 540,  # km above Earth
                    "mass": 11110  # kg
                }
            },
            "iss": {
                "positions": [],
                "info": {
                    "name": "International Space Station",
                    "launch_date": "November 20, 1998",
                    "orbit_height": 400,  # km above Earth
                    "mass": 420000  # kg
                }
            },
            "metadata": {
                "frames": frames,
                "fps": 24,
                "duration": frames / 24,
                "orbitType": "circular"
            }
        }
        
        # Orbit heights in km above Earth surface
        hubble_orbit_radius = data["earth"]["radius"] + data["hubble"]["info"]["orbit_height"]
        iss_orbit_radius = data["earth"]["radius"] + data["iss"]["info"]["orbit_height"]
        
        # Generate satellite positions for each frame
        for frame in range(frames):
            # Primary satellite - circular orbit
            angle = 2 * np.pi * frame / frames  # 0 to 2π
            x = radius * np.cos(angle)
            z = radius * np.sin(angle)
            data["satellite"]["positions"].append([x, 0, z])
            
            # Hubble - elliptical inclined orbit
            hubble_angle = 2 * np.pi * frame / frames  # Same period but slightly inclined
            hubble_x = hubble_orbit_radius * np.cos(hubble_angle)
            hubble_y = hubble_orbit_radius * np.sin(hubble_angle) * 0.2  # Inclination factor
            hubble_z = hubble_orbit_radius * np.sin(hubble_angle)
            data["hubble"]["positions"].append([hubble_x, hubble_y, hubble_z])
            
            # ISS - different orbital period and inclination
            iss_angle = 2 * np.pi * frame / (frames * 0.8)  # Slightly faster orbit
            iss_x = iss_orbit_radius * np.cos(iss_angle)
            iss_y = iss_orbit_radius * np.sin(iss_angle) * 0.4  # Steeper inclination
            iss_z = iss_orbit_radius * np.sin(iss_angle)
            data["iss"]["positions"].append([iss_x, iss_y, iss_z])
        
        logger.debug(f"Generated orbit data with {frames} frames")
        return data

# Default implementation
_default_orbit_generator = CircularOrbitGenerator()

# Dependency to get orbit generator
def get_orbit_generator() -> OrbitDataGenerator:
    """Dependency that provides the orbit generator implementation"""
    return _default_orbit_generator

# Helper function (consistent with dependency injection pattern)
def generate_orbit_data(frames: int = 240, radius: float = 6800) -> Dict[str, Any]:
    """Generate orbit data using the default generator"""
    return _default_orbit_generator.generate_data(frames, radius)

# Routes
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render main visualization page"""
    try:
        return templates.TemplateResponse("index.html", {"request": request})
    except Exception as e:
        logger.error(f"Error rendering index template: {e}")
        raise HTTPException(status_code=500, detail="Error rendering page")

@app.get("/api/orbit-data")
async def orbit_data(
    frames: Optional[int] = None,
    radius: Optional[float] = None,
    orbit_generator: OrbitDataGenerator = Depends(get_orbit_generator)
):
    """Return orbit data as JSON"""
    try:
        kwargs = {}
        if frames is not None:
            kwargs["frames"] = frames
        if radius is not None:
            kwargs["radius"] = radius
            
        return orbit_generator.generate_data(**kwargs)
    except Exception as e:
        logger.error(f"Error generating orbit data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "satellite-orbit-visualization"}

# Start the application
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    
    logger.info(f"Starting Satellite-Orbit Visualization on port {port}")
    print(f"Starting Satellite-Orbit Visualization on port {port}")
    print("Open http://localhost:{port} in your browser to view the visualization")
    
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
