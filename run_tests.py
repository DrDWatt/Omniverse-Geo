#!/usr/bin/env python3
"""
Test runner for Omniverse Satellite-Orbit PoC
This script runs all unit tests and reports results
"""
import unittest
import sys
import os
import importlib.util
import time

def import_module_from_file(module_name, file_path):
    """Import a module from file path"""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

def run_tests():
    """Run all test cases and return success status"""
    print("\n========================================")
    print("RUNNING OMNIVERSE SATELLITE-ORBIT TESTS")
    print("========================================\n")
    
    # Discover and run tests
    test_loader = unittest.TestLoader()
    test_suite = unittest.TestSuite()
    
    # Manual test discovery (more control than unittest.discover)
    test_dir = '/workspace/tests'
    
    if not os.path.exists(test_dir):
        print(f"Test directory '{test_dir}' not found!")
        return False
    
    test_files = [f for f in os.listdir(test_dir) if f.startswith('test_') and f.endswith('.py')]
    
    if not test_files:
        print("No test files found!")
        return False
    
    print(f"Found {len(test_files)} test files: {', '.join(test_files)}")
    
    # Import each test file and add its tests to the suite
    for test_file in test_files:
        module_name = os.path.splitext(test_file)[0]
        file_path = os.path.join(test_dir, test_file)
        
        try:
            module = import_module_from_file(module_name, file_path)
            tests = test_loader.loadTestsFromModule(module)
            test_suite.addTests(tests)
        except Exception as e:
            print(f"Error importing tests from {test_file}: {e}")
    
    # Run tests with verbose output
    test_runner = unittest.TextTestRunner(verbosity=2)
    result = test_runner.run(test_suite)
    
    # Check if all tests passed
    success = result.wasSuccessful()
    
    print("\n========================================")
    if success:
        print("✅ ALL TESTS PASSED!")
    else:
        print(f"❌ TESTS FAILED: {len(result.failures)} failures, {len(result.errors)} errors")
    print("========================================\n")
    
    return success

if __name__ == "__main__":
    # Run the tests
    success = run_tests()
    
    if success:
        print("Tests completed successfully. Running the application...\n")
        time.sleep(1)  # Brief pause for readability
        
        # If tests passed, we can now run the application
        # Import and run the autoplay script
        try:
            import autoplay
            print("Application started!")
        except Exception as e:
            print(f"Error starting application: {e}")
            sys.exit(1)
    else:
        print("Tests failed. Please fix the issues before running the application.")
        sys.exit(1)
