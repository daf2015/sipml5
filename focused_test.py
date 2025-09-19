#!/usr/bin/env python3
"""
Focused test for user-reported issues with edificio creation and deletion
"""
import requests
import json
from datetime import datetime

class FocusedTester:
    def __init__(self):
        self.base_url = "https://intercom-edificios.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.edificio_id = None

    def login(self):
        """Login as edificio admin"""
        print("🔐 Logging in as diego@daf-il.net...")
        
        response = requests.post(
            f"{self.api_url}/auth/login",
            json={"email": "diego@daf-il.net", "password": "tangotango"},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            print(f"✅ Login successful - Role: {data['user']['role']}")
            return True
        else:
            print(f"❌ Login failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    def test_slug_availability(self):
        """Test slug availability check"""
        print("\n🔍 Testing slug availability...")
        
        # Test the exact slug from user request
        response = requests.get(
            f"{self.api_url}/edificios/check-slug/test-edificio",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Slug check successful")
            print(f"   Available: {data.get('available')}")
            print(f"   Message: {data.get('message')}")
            if not data.get('available'):
                print(f"   Suggestions: {data.get('suggestions', [])}")
            return True
        else:
            print(f"❌ Slug check failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    def test_create_edificio(self):
        """Test creating edificio with exact user data"""
        print("\n🏗️ Testing edificio creation...")
        
        # Exact data from user request
        edificio_data = {
            "nombre": "Edificio Test",
            "slug_personalizado": "test-edificio",
            "admin_nombre": "Diego Test", 
            "cantidad_viviendas": 10
        }
        
        response = requests.post(
            f"{self.api_url}/edificios/create-my",
            json=edificio_data,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            self.edificio_id = data.get('id')
            print(f"✅ Edificio creation successful")
            print(f"   ID: {data.get('id')}")
            print(f"   Nombre: {data.get('nombre')}")
            print(f"   Slug: {data.get('slug')}")
            print(f"   Admin: {data.get('admin_nombre')}")
            print(f"   Viviendas: {data.get('cantidad_viviendas')}")
            return True
        else:
            print(f"❌ Edificio creation failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    def test_get_my_edificios(self):
        """Test getting admin's edificios"""
        print("\n📋 Testing get my edificios...")
        
        response = requests.get(
            f"{self.api_url}/edificios/my",
            headers={'Authorization': f'Bearer {self.token}'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Get edificios successful")
            edificio = data.get('edificio', {})
            print(f"   Edificio: {edificio.get('nombre')}")
            print(f"   Slug: {edificio.get('slug')}")
            print(f"   Viviendas count: {len(data.get('viviendas', []))}")
            print(f"   Public URL: {data.get('url_publica')}")
            return True
        else:
            print(f"❌ Get edificios failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    def test_delete_edificio(self):
        """Test deleting the edificio"""
        if not self.edificio_id:
            print("\n❌ No edificio ID available for deletion")
            return False
            
        print(f"\n🗑️ Testing edificio deletion (ID: {self.edificio_id})...")
        
        response = requests.delete(
            f"{self.api_url}/edificios/my/{self.edificio_id}",
            headers={'Authorization': f'Bearer {self.token}'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Edificio deletion successful")
            print(f"   Message: {data.get('message')}")
            print(f"   Viviendas eliminadas: {data.get('viviendas_eliminadas', 0)}")
            return True
        else:
            print(f"❌ Edificio deletion failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

def main():
    print("🎯 FOCUSED TEST - User Reported Issues")
    print("Testing specific endpoints that user says are not working")
    print("=" * 60)
    
    tester = FocusedTester()
    
    # Test sequence
    if not tester.login():
        print("❌ Cannot proceed without login")
        return 1
    
    tests_passed = 0
    total_tests = 4
    
    # Test slug availability
    if tester.test_slug_availability():
        tests_passed += 1
    
    # Test edificio creation
    if tester.test_create_edificio():
        tests_passed += 1
    
    # Test getting edificios
    if tester.test_get_my_edificios():
        tests_passed += 1
    
    # Test edificio deletion
    if tester.test_delete_edificio():
        tests_passed += 1
    
    print("\n" + "=" * 60)
    print(f"📊 FOCUSED TEST RESULTS: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 ALL USER-REPORTED ENDPOINTS ARE WORKING CORRECTLY!")
        print("✅ Edificio creation works")
        print("✅ Edificio deletion works") 
        print("✅ Slug availability check works")
        print("✅ Get my edificios works")
        return 0
    else:
        print(f"⚠️ {total_tests - tests_passed} critical endpoints failed")
        return 1

if __name__ == "__main__":
    exit(main())