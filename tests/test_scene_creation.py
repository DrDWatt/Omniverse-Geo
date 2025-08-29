import unittest
import os
import sys
from pxr import Usd, UsdGeom

class TestSceneCreation(unittest.TestCase):
    """Test the USD scene creation functionality"""
    
    @classmethod
    def setUpClass(cls):
        """Run scene creation before tests if needed"""
        # Check if USD file exists, if not try to create it
        if not os.path.exists("/workspace/EarthOrbit.usd"):
            print("Scene file doesn't exist, attempting to create it...")
            try:
                # Import create_scene dynamically
                sys.path.append("/workspace")
                # This import will execute the script and create the USD file
                import create_scene
            except Exception as e:
                print(f"Error creating scene: {e}")
    
    def test_scene_file_exists(self):
        """Test that the USD scene file was created"""
        self.assertTrue(os.path.exists("/workspace/EarthOrbit.usd"), 
                      "EarthOrbit.usd file should exist")
    
    def test_scene_structure(self):
        """Test that the scene has the correct structure"""
        stage = Usd.Stage.Open("/workspace/EarthOrbit.usd")
        self.assertIsNotNone(stage, "Should be able to open USD stage")
        
        # Test world prim exists
        world = stage.GetPrimAtPath("/World")
        self.assertTrue(world.IsValid(), "World prim should exist")
        
        # Test earth exists
        earth = stage.GetPrimAtPath("/World/Earth")
        self.assertTrue(earth.IsValid(), "Earth prim should exist")
        self.assertEqual(earth.GetTypeName(), "Sphere", "Earth should be a sphere")
        
        # Test orbit pivot exists
        pivot = stage.GetPrimAtPath("/World/OrbitPivot")
        self.assertTrue(pivot.IsValid(), "OrbitPivot prim should exist")
        
        # Test satellite exists
        satellite = stage.GetPrimAtPath("/World/OrbitPivot/Satellite")
        self.assertTrue(satellite.IsValid(), "Satellite prim should exist")
        self.assertEqual(satellite.GetTypeName(), "Cube", "Satellite should be a cube")
    
    def test_animation_setup(self):
        """Test that animation properties are correctly set"""
        stage = Usd.Stage.Open("/workspace/EarthOrbit.usd")
        
        # Test stage has animation range set
        self.assertEqual(stage.GetStartTimeCode(), 0, "Start frame should be 0")
        self.assertEqual(stage.GetEndTimeCode(), 240, "End frame should be 240")
        
        # Test pivot has rotation animation
        pivot = stage.GetPrimAtPath("/World/OrbitPivot")
        xformable = UsdGeom.Xformable(pivot)
        
        rotOps = [op for op in xformable.GetOrderedXformOps() 
                  if op.GetName() == "xformOp:rotateY"]
        
        self.assertTrue(len(rotOps) > 0, "Should have rotateY xform operation")
        rotOp = rotOps[0]
        
        # Test rotation at key frames
        self.assertTrue(rotOp.GetNumTimeSamples() > 1, "Should have multiple time samples for rotation")
        
        # Test start and end rotation values (if available)
        if rotOp.GetNumTimeSamples() >= 2:
            timesamples = rotOp.GetTimeSamples()
            start_time = min(timesamples)
            end_time = max(timesamples)
            
            start_val = rotOp.Get(start_time)
            end_val = rotOp.Get(end_time)
            
            self.assertNotEqual(start_val, end_val, "Start and end rotation should differ")

if __name__ == "__main__":
    unittest.main()
