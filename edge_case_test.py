#!/usr/bin/env python3
"""
Edge case testing for edificio endpoints
"""
import requests
import json

class EdgeCaseTester:
    def __init__(self):
        self.base_url = "https://intercom-edificios-1.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None

    def login(self):
        """Login as edificio admin"""
        response = requests.post(
            f"{self.api_url}/auth/login",
            json={"email": "diego@daf-il.net", "password": "tangotango"},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            return True
        return False

    def test_duplicate_slug(self):
        """Test creating edificio with duplicate slug"""
        print("🔍 Testing duplicate slug creation...")
        
        # Create first edificio
        edificio_data1 = {
            "nombre": "Edificio Uno",
            "slug_personalizado": "edificio-duplicado",
            "admin_nombre": "Admin Uno",
            "cantidad_viviendas": 5
        }
        
        response1 = requests.post(
            f"{self.api_url}/edificios/create-my",
            json=edificio_data1,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.token}'
            },
            timeout=10
        )
        
        if response1.status_code == 200:
            edificio1_id = response1.json().get('id')
            print("✅ First edificio created successfully")
            
            # Try to create second edificio with same slug
            edificio_data2 = {
                "nombre": "Edificio Dos",
                "slug_personalizado": "edificio-duplicado",
                "admin_nombre": "Admin Dos", 
                "cantidad_viviendas": 8
            }
            
            response2 = requests.post(
                f"{self.api_url}/edificios/create-my",
                json=edificio_data2,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.token}'
                },
                timeout=10
            )
            
            if response2.status_code == 400:
                error_data = response2.json()
                print("✅ Duplicate slug correctly rejected")
                print(f"   Error: {error_data.get('detail')}")
                
                # Clean up first edificio
                requests.delete(
                    f"{self.api_url}/edificios/my/{edificio1_id}",
                    headers={'Authorization': f'Bearer {self.token}'},
                    timeout=10
                )
                return True
            else:
                print(f"❌ Duplicate slug should have been rejected - Status: {response2.status_code}")
                return False
        else:
            print(f"❌ First edificio creation failed - Status: {response1.status_code}")
            return False

    def test_invalid_slug_formats(self):
        """Test invalid slug formats"""
        print("\n🔍 Testing invalid slug formats...")
        
        invalid_slugs = [
            ("", "empty slug"),
            ("ab", "too short"),
            ("UPPERCASE", "uppercase letters"),
            ("slug with spaces", "spaces"),
            ("slug_with_underscores", "underscores"),
            ("slug.with.dots", "dots"),
            ("-starting-dash", "starting with dash"),
            ("ending-dash-", "ending with dash"),
            ("a" * 60, "too long")
        ]
        
        passed_tests = 0
        total_tests = len(invalid_slugs)
        
        for slug, description in invalid_slugs:
            edificio_data = {
                "nombre": f"Test {description}",
                "slug_personalizado": slug,
                "admin_nombre": "Test Admin",
                "cantidad_viviendas": 5
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
            
            if response.status_code == 422:  # Validation error expected
                print(f"✅ {description} correctly rejected")
                passed_tests += 1
            else:
                print(f"❌ {description} should have been rejected - Status: {response.status_code}")
        
        print(f"   Validation tests: {passed_tests}/{total_tests} passed")
        return passed_tests == total_tests

    def test_edificio_limits(self):
        """Test edificio creation limits"""
        print("\n🔍 Testing edificio limits...")
        
        # Test maximum viviendas limit
        edificio_data = {
            "nombre": "Edificio Limite",
            "slug_personalizado": "edificio-limite-test",
            "admin_nombre": "Admin Limite",
            "cantidad_viviendas": 150  # Over the limit of 100
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
        
        if response.status_code == 422:  # Validation error expected
            print("✅ Vivienda limit correctly enforced")
            return True
        else:
            print(f"❌ Vivienda limit should have been enforced - Status: {response.status_code}")
            return False

def main():
    print("🧪 EDGE CASE TESTING - Edificio Endpoints")
    print("=" * 50)
    
    tester = EdgeCaseTester()
    
    if not tester.login():
        print("❌ Cannot proceed without login")
        return 1
    
    tests_passed = 0
    total_tests = 3
    
    # Test duplicate slug handling
    if tester.test_duplicate_slug():
        tests_passed += 1
    
    # Test invalid slug formats
    if tester.test_invalid_slug_formats():
        tests_passed += 1
    
    # Test edificio limits
    if tester.test_edificio_limits():
        tests_passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 EDGE CASE RESULTS: {tests_passed}/{total_tests} test groups passed")
    
    if tests_passed == total_tests:
        print("🎉 All edge cases handled correctly!")
        return 0
    else:
        print(f"⚠️ {total_tests - tests_passed} edge case groups failed")
        return 1

if __name__ == "__main__":
    exit(main())