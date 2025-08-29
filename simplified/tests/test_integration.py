"""
Integration tests for Satellite-Orbit visualization application
"""
import sys
import os
import time
import unittest
import requests
import multiprocessing
import uvicorn

# Add parent directory to path to import app module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

def run_app():
    """Run the application server for integration testing"""
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="error")

class IntegrationTest(unittest.TestCase):
    """Integration tests for the complete application stack"""
    
    server_process = None
    
    @classmethod
    def setUpClass(cls):
        """Start the application server in a separate process"""
        cls.server_process = multiprocessing.Process(target=run_app)
        cls.server_process.start()
        # Wait for server to start
        time.sleep(2)
    
    @classmethod
    def tearDownClass(cls):
        """Stop the application server"""
        if cls.server_process:
            cls.server_process.terminate()
            cls.server_process.join(1)
    
    def setUp(self):
        """Set up for each test"""
        self.base_url = "http://127.0.0.1:8765"
    
    def test_index_page_loads(self):
        """Test that the main page can be loaded"""
        response = requests.get(f"{self.base_url}/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Satellite-Orbit Visualization", response.text)
    
    def test_api_response(self):
        """Test that the API returns valid data"""
        response = requests.get(f"{self.base_url}/api/orbit-data")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check structure
        self.assertIn("earth", data)
        self.assertIn("satellite", data)
        self.assertIn("metadata", data)
        
        # Check data content
        self.assertEqual(len(data["satellite"]["positions"]), 240)
        self.assertEqual(data["earth"]["radius"], 6371)
    
    def test_custom_parameters(self):
        """Test that the API accepts custom parameters"""
        custom_frames = 120
        custom_radius = 8000
        
        response = requests.get(
            f"{self.base_url}/api/orbit-data?frames={custom_frames}&radius={custom_radius}"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Check custom parameters were applied
        self.assertEqual(len(data["satellite"]["positions"]), custom_frames)
        self.assertEqual(data["satellite"]["positions"][0][0], custom_radius)
    
    def test_health_endpoint(self):
        """Test that the health endpoint returns healthy status"""
        response = requests.get(f"{self.base_url}/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "satellite-orbit-visualization")

if __name__ == "__main__":
    unittest.main()
