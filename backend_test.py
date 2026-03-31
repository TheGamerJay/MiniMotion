#!/usr/bin/env python3

import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image
import numpy as np

class MiniEditorAPITester:
    def __init__(self, base_url="https://frame-morph.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")

            return success, response

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def create_test_frame(self, width=512, height=512):
        """Create a test frame as base64 encoded PNG"""
        # Create a simple test image
        img = Image.new('RGBA', (width, height), (255, 0, 0, 128))  # Semi-transparent red
        
        # Add some pattern
        pixels = img.load()
        for x in range(0, width, 20):
            for y in range(0, height, 20):
                if (x + y) % 40 == 0:
                    pixels[x, y] = (0, 255, 0, 255)  # Green dots
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode('utf-8')

    def test_health_endpoint(self):
        """Test the health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API",
            "GET",
            "api/",
            200
        )
        return success

    def test_status_create(self):
        """Test creating a status check"""
        success, response = self.run_test(
            "Create Status Check",
            "POST",
            "api/status",
            200,
            data={"client_name": "test_client"}
        )
        return success

    def test_status_list(self):
        """Test listing status checks"""
        success, response = self.run_test(
            "List Status Checks",
            "GET",
            "api/status",
            200
        )
        return success

    def test_export_gif(self):
        """Test GIF export functionality"""
        # Create test frames
        frames = []
        for i in range(3):  # 3 frames for quick test
            frame = self.create_test_frame()
            frames.append(frame)
        
        export_data = {
            "frames": frames,
            "fps": 24,
            "width": 512,
            "height": 512,
            "format": "gif",
            "loop": True
        }
        
        success, response = self.run_test(
            "Export GIF",
            "POST",
            "api/export",
            200,
            data=export_data
        )
        
        if success and response:
            # Check if we got a GIF file
            content_type = response.headers.get('content-type', '')
            if 'image/gif' in content_type:
                print(f"   ✅ Received GIF file ({len(response.content)} bytes)")
            else:
                print(f"   ⚠️  Unexpected content type: {content_type}")
        
        return success

    def test_export_webm(self):
        """Test WebM export functionality"""
        # Create test frames
        frames = []
        for i in range(3):  # 3 frames for quick test
            frame = self.create_test_frame()
            frames.append(frame)
        
        export_data = {
            "frames": frames,
            "fps": 24,
            "width": 512,
            "height": 512,
            "format": "webm",
            "loop": True
        }
        
        success, response = self.run_test(
            "Export WebM",
            "POST",
            "api/export",
            200,
            data=export_data
        )
        
        if success and response:
            # Check if we got a WebM file
            content_type = response.headers.get('content-type', '')
            if 'video/webm' in content_type:
                print(f"   ✅ Received WebM file ({len(response.content)} bytes)")
            else:
                print(f"   ⚠️  Unexpected content type: {content_type}")
        
        return success

    def test_export_invalid_format(self):
        """Test export with invalid format"""
        frames = [self.create_test_frame()]
        
        export_data = {
            "frames": frames,
            "fps": 24,
            "width": 512,
            "height": 512,
            "format": "invalid",
            "loop": True
        }
        
        success, response = self.run_test(
            "Export Invalid Format",
            "POST",
            "api/export",
            400,  # Should return 400 for invalid format
            data=export_data
        )
        
        return success

    def test_export_no_frames(self):
        """Test export with no frames"""
        export_data = {
            "frames": [],
            "fps": 24,
            "width": 512,
            "height": 512,
            "format": "gif",
            "loop": True
        }
        
        success, response = self.run_test(
            "Export No Frames",
            "POST",
            "api/export",
            400,  # Should return 400 for no frames
            data=export_data
        )
        
        return success

def main():
    print("🚀 Starting Mini Editor API Tests")
    print("=" * 50)
    
    tester = MiniEditorAPITester()
    
    # Run all tests
    tests = [
        tester.test_health_endpoint,
        tester.test_root_endpoint,
        tester.test_status_create,
        tester.test_status_list,
        tester.test_export_gif,
        tester.test_export_webm,
        tester.test_export_invalid_format,
        tester.test_export_no_frames,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            tester.tests_run += 1
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())