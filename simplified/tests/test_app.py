"""
Test suite for Satellite-Orbit visualization application
"""
import sys
import os
import pytest
import numpy as np
from fastapi.testclient import TestClient

# Add parent directory to path to import app module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app, generate_orbit_data

# Create test client
client = TestClient(app)

class TestRoutes:
    """Test API routes"""
    
    def test_index_route(self):
        """Test the main index route returns HTML"""
        response = client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        assert "Satellite-Orbit Visualization" in response.text
    
    def test_orbit_data_api(self):
        """Test orbit data API returns valid data structure"""
        response = client.get("/api/orbit-data")
        assert response.status_code == 200
        
        # Verify JSON structure
        data = response.json()
        assert "earth" in data
        assert "satellite" in data
        assert "metadata" in data
        
        # Check Earth data
        assert "position" in data["earth"]
        assert "radius" in data["earth"]
        assert data["earth"]["radius"] > 0
        
        # Check satellite data
        assert "positions" in data["satellite"]
        assert len(data["satellite"]["positions"]) > 0
        
        # Check metadata
        assert "frames" in data["metadata"]
        assert "fps" in data["metadata"]
        assert "duration" in data["metadata"]
        assert data["metadata"]["frames"] > 0
        assert data["metadata"]["fps"] > 0
        assert data["metadata"]["duration"] > 0


class TestOrbitCalculation:
    """Test orbit data calculation functions"""
    
    def test_generate_orbit_data(self):
        """Test orbit data generation function"""
        # Test with default parameters
        data = generate_orbit_data()
        assert len(data["satellite"]["positions"]) == 240
        
        # Test with custom parameters
        custom_frames = 120
        custom_radius = 8000
        data = generate_orbit_data(frames=custom_frames, radius=custom_radius)
        
        assert len(data["satellite"]["positions"]) == custom_frames
        
        # Verify first position is on X axis
        first_pos = data["satellite"]["positions"][0]
        assert abs(first_pos[0] - custom_radius) < 0.001
        assert abs(first_pos[1]) < 0.001
        assert abs(first_pos[2]) < 0.001
        
        # Verify position at 1/4 of orbit is on Z axis
        quarter_idx = custom_frames // 4
        quarter_pos = data["satellite"]["positions"][quarter_idx]
        assert abs(quarter_pos[0]) < 0.001
        assert abs(quarter_pos[1]) < 0.001
        assert abs(quarter_pos[2] - custom_radius) < 0.001
        
        # Verify full orbit closes the loop
        assert np.allclose(
            data["satellite"]["positions"][0], 
            data["satellite"]["positions"][-1], 
            atol=0.001
        ) == False  # Should not be the same point (almost, but not exact)
    
    def test_orbit_position_calculation(self):
        """Test mathematical correctness of orbit positions"""
        data = generate_orbit_data(frames=360)
        positions = data["satellite"]["positions"]
        
        # For a circle, positions should follow sin/cos pattern
        # Test positions at cardinal points (0°, 90°, 180°, 270°)
        radius = data["satellite"]["positions"][0][0]  # Radius = X at first position
        
        # 0° - Position on positive X axis
        assert abs(positions[0][0] - radius) < 0.001
        assert abs(positions[0][2]) < 0.001
        
        # 90° - Position on positive Z axis
        assert abs(positions[90][0]) < 0.001
        assert abs(positions[90][2] - radius) < 0.001
        
        # 180° - Position on negative X axis
        assert abs(positions[180][0] + radius) < 0.001
        assert abs(positions[180][2]) < 0.001
        
        # 270° - Position on negative Z axis
        assert abs(positions[270][0]) < 0.001
        assert abs(positions[270][2] + radius) < 0.001

if __name__ == "__main__":
    pytest.main(["-xvs", __file__])
