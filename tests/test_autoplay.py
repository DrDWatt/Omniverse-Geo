import unittest
import os
import sys
from unittest.mock import MagicMock, patch

class TestAutoplay(unittest.TestCase):
    """Test the autoplay functionality"""
    
    def test_autoplay_file_exists(self):
        """Test that the autoplay script exists"""
        self.assertTrue(os.path.exists("/workspace/autoplay.py"), 
                      "autoplay.py file should exist")
    
    @patch('omni.timeline.get_timeline_interface')
    def test_autoplay_functionality(self, mock_get_timeline):
        """Test that autoplay script calls the right functions"""
        # Create a mock timeline interface
        mock_timeline = MagicMock()
        mock_get_timeline.return_value = mock_timeline
        
        # Import autoplay (which will call our mock)
        sys.path.append("/workspace")
        import autoplay
        
        # Verify the timeline.play() was called
        mock_timeline.play.assert_called_once()

if __name__ == "__main__":
    unittest.main()
