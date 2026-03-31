#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class MiniEditorAPITester:
    def __init__(self, base_url="https://frame-morph.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    print(f"   Response: {response.text[:200]}...")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health endpoint for Mini Editor"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        if success and 'status' in response:
            expected_status = 'healthy'
            if response['status'] == expected_status:
                print(f"   ✅ Health status correct: {response['status']}")
                return True
            else:
                print(f"   ❌ Health status incorrect: expected '{expected_status}', got '{response['status']}'")
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Info",
            "GET", 
            "api/",
            200
        )
        if success and 'message' in response:
            if 'Mini Editor API' in response['message']:
                print(f"   ✅ API message correct: {response['message']}")
                return True
            else:
                print(f"   ❌ API message incorrect: {response['message']}")
        return success

    def test_status_crud(self):
        """Test status check CRUD operations"""
        # Create status check
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "api/status",
            200,
            data=test_data
        )
        
        if not success:
            return False
            
        # Verify response structure
        if 'id' in response and 'client_name' in response and 'timestamp' in response:
            print(f"   ✅ Status check created with ID: {response['id']}")
        else:
            print(f"   ❌ Status check response missing required fields")
            return False
            
        # Get status checks
        success, response = self.run_test(
            "Get Status Checks",
            "GET",
            "api/status", 
            200
        )
        
        if success and isinstance(response, list):
            print(f"   ✅ Retrieved {len(response)} status checks")
            return True
        else:
            print(f"   ❌ Failed to retrieve status checks")
            return False

    def test_export_gif(self):
        """Test GIF export functionality"""
        # Create a simple test frame (1x1 red pixel as base64 PNG)
        test_frame = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        export_data = {
            "frames": [test_frame, test_frame],  # 2 identical frames
            "fps": 24,
            "width": 1,
            "height": 1,
            "format": "gif",
            "loop": True
        }
        
        success, _ = self.run_test(
            "Export GIF",
            "POST",
            "api/export",
            200,
            data=export_data
        )
        return success

    def test_export_webm(self):
        """Test WebM export functionality"""
        # Create a simple test frame (1x1 red pixel as base64 PNG)
        test_frame = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        export_data = {
            "frames": [test_frame, test_frame],  # 2 identical frames
            "fps": 24,
            "width": 1,
            "height": 1,
            "format": "webm",
            "loop": True
        }
        
        success, _ = self.run_test(
            "Export WebM",
            "POST",
            "api/export",
            200,
            data=export_data
        )
        return success

    def test_export_error_handling(self):
        """Test export error handling"""
        # Test invalid format
        export_data = {
            "frames": ["invalid_frame"],
            "fps": 24,
            "width": 1,
            "height": 1,
            "format": "invalid_format",
            "loop": True
        }
        
        success, _ = self.run_test(
            "Export Invalid Format",
            "POST",
            "api/export",
            400,
            data=export_data
        )
        
        if success:
            print("   ✅ Correctly rejected invalid format")
        
        # Test no frames
        export_data = {
            "frames": [],
            "fps": 24,
            "width": 1,
            "height": 1,
            "format": "gif",
            "loop": True
        }
        
        success2, _ = self.run_test(
            "Export No Frames",
            "POST",
            "api/export",
            400,
            data=export_data
        )
        
        if success2:
            print("   ✅ Correctly rejected empty frames")
            
        return success and success2

def main():
    """Run all backend tests for Mini Editor"""
    print("🚀 Starting Mini Editor Backend API Tests")
    print("=" * 50)
    
    tester = MiniEditorAPITester()
    
    # Run all tests
    tests = [
        tester.test_health_endpoint,
        tester.test_root_endpoint,
        tester.test_status_crud,
        tester.test_export_gif,
        tester.test_export_webm,
        tester.test_export_error_handling,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Backend Tests Summary:")
    print(f"   Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())