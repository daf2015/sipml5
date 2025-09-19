import requests
import sys
import json
from datetime import datetime
import time

class IntercomunicadorTester:
    def __init__(self, base_url="https://intercom-edificios.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.super_admin_token = None
        self.edificio_admin_token = None
        self.edificio_id = None
        self.edificio_slug = None
        self.vivienda_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_super_admin_login(self):
        """Test super admin login"""
        success, response = self.run_test(
            "Super Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "diegofridman@gmail.com", "password": "tangotango"}
        )
        if success and 'access_token' in response:
            self.super_admin_token = response['access_token']
            print(f"   Super admin role: {response.get('user', {}).get('role')}")
            return True
        return False

    def test_edificio_admin_login(self):
        """Test edificio admin login"""
        success, response = self.run_test(
            "Edificio Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "diego@daf-il.net", "password": "tangotango"}
        )
        if success and 'access_token' in response:
            self.edificio_admin_token = response['access_token']
            print(f"   Edificio admin role: {response.get('user', {}).get('role')}")
            print(f"   Edificio ID: {response.get('user', {}).get('edificio_id')}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid credentials"""
        success, _ = self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"}
        )
        return success

    def test_super_admin_dashboard(self):
        """Test super admin dashboard"""
        success, response = self.run_test(
            "Super Admin Dashboard",
            "GET",
            "admin/dashboard",
            200,
            token=self.super_admin_token
        )
        if success:
            print(f"   Total Edificios: {response.get('total_edificios', 0)}")
            print(f"   Total Admins: {response.get('total_admins', 0)}")
            print(f"   Total Viviendas: {response.get('total_viviendas', 0)}")
            print(f"   Edificios Activos: {response.get('edificios_activos', 0)}")
        return success

    def test_create_edificio(self):
        """Test creating an edificio"""
        test_timestamp = datetime.now().strftime('%H%M%S')
        edificio_data = {
            "nombre": f"Edificio Test {test_timestamp}",
            "admin_email": f"admin{test_timestamp}@test.com"
        }
        
        success, response = self.run_test(
            "Create Edificio",
            "POST",
            "admin/edificios",
            200,
            data=edificio_data,
            token=self.super_admin_token
        )
        if success:
            self.edificio_id = response.get('id')
            self.edificio_slug = response.get('slug')
            print(f"   Edificio ID: {self.edificio_id}")
            print(f"   Edificio Slug: {self.edificio_slug}")
            print(f"   Admin Email: {response.get('admin_email')}")
        return success

    def test_create_my_edificio(self):
        """Test creating edificio as edificio admin - SPECIFIC USER ISSUE"""
        edificio_data = {
            "nombre": "Edificio Test",
            "slug_personalizado": "test-edificio",
            "admin_nombre": "Diego Test",
            "cantidad_viviendas": 10
        }
        
        success, response = self.run_test(
            "Create My Edificio (Admin)",
            "POST",
            "edificios/create-my",
            200,
            data=edificio_data,
            token=self.edificio_admin_token
        )
        if success:
            self.edificio_id = response.get('id')
            self.edificio_slug = response.get('slug')
            print(f"   Edificio ID: {self.edificio_id}")
            print(f"   Edificio Slug: {self.edificio_slug}")
            print(f"   Admin Nombre: {response.get('admin_nombre')}")
            print(f"   Cantidad Viviendas: {response.get('cantidad_viviendas')}")
        return success

    def test_check_slug_availability(self):
        """Test slug availability check - SPECIFIC USER ISSUE"""
        # Test available slug
        success1, response1 = self.run_test(
            "Check Available Slug",
            "GET",
            "edificios/check-slug/nuevo-edificio-test",
            200
        )
        if success1:
            print(f"   Available: {response1.get('available')}")
            print(f"   Message: {response1.get('message')}")
        
        # Test unavailable slug (if we have one)
        success2, response2 = self.run_test(
            "Check Unavailable Slug",
            "GET",
            "edificios/check-slug/test-edificio",
            200
        )
        if success2:
            print(f"   Available: {response2.get('available')}")
            print(f"   Message: {response2.get('message')}")
            if not response2.get('available'):
                print(f"   Suggestions: {response2.get('suggestions', [])}")
        
        return success1 and success2

    def test_delete_my_edificio(self):
        """Test deleting my edificio as edificio admin - SPECIFIC USER ISSUE"""
        if not self.edificio_id:
            print("❌ No edificio ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete My Edificio (Admin)",
            "DELETE",
            f"edificios/my/{self.edificio_id}",
            200,
            token=self.edificio_admin_token
        )
        if success:
            print(f"   Message: {response.get('message')}")
            print(f"   Viviendas eliminadas: {response.get('viviendas_eliminadas', 0)}")
        return success

    def test_edificio_admin_my_edificio(self):
        """Test edificio admin getting their edificio data"""
        success, response = self.run_test(
            "Get My Edificio",
            "GET",
            "edificios/my",
            200,
            token=self.edificio_admin_token
        )
        if success:
            edificio_data = response.get('edificio', {})
            print(f"   Edificio name: {edificio_data.get('nombre')}")
            print(f"   Edificio slug: {edificio_data.get('slug')}")
            print(f"   Viviendas count: {len(response.get('viviendas', []))}")
            print(f"   Public URL: {response.get('url_publica')}")
            # Store slug for public test
            if edificio_data.get('slug'):
                self.edificio_slug = edificio_data.get('slug')
        return success

    def test_add_vivienda(self):
        """Test adding a vivienda"""
        vivienda_data = {
            "nombre_familia": "Familia Test",
            "phone": "+972501234567",
            "publicar_nombre": True
        }
        
        success, response = self.run_test(
            "Add Vivienda",
            "POST",
            "edificios/my/viviendas",
            200,
            data=vivienda_data,
            token=self.edificio_admin_token
        )
        if success:
            self.vivienda_id = response.get('id')
            print(f"   Vivienda ID: {self.vivienda_id}")
            print(f"   Vivienda numero: {response.get('numero')}")
            print(f"   Nombre familia: {response.get('nombre_familia')}")
            print(f"   Phone: {response.get('phone')}")
            print(f"   Publicar nombre: {response.get('publicar_nombre')}")
        return success

    def test_add_private_vivienda(self):
        """Test adding a private vivienda"""
        vivienda_data = {
            "nombre_familia": "Familia Privada",
            "phone": "+972509876543",
            "publicar_nombre": False
        }
        
        success, response = self.run_test(
            "Add Private Vivienda",
            "POST",
            "edificios/my/viviendas",
            200,
            data=vivienda_data,
            token=self.edificio_admin_token
        )
        if success:
            print(f"   Private Vivienda numero: {response.get('numero')}")
            print(f"   Publicar nombre: {response.get('publicar_nombre')}")
        return success

    def test_update_vivienda(self):
        """Test updating a vivienda"""
        if not self.vivienda_id:
            print("❌ No vivienda ID available for update test")
            return False
            
        updated_data = {
            "nombre_familia": "Familia Test Actualizada",
            "phone": "+972507654321",
            "publicar_nombre": False
        }
        
        success, response = self.run_test(
            "Update Vivienda",
            "PUT",
            f"edificios/my/viviendas/{self.vivienda_id}",
            200,
            data=updated_data,
            token=self.edificio_admin_token
        )
        if success:
            print(f"   Updated nombre: {response.get('nombre_familia')}")
            print(f"   Updated phone: {response.get('phone')}")
            print(f"   Updated publicar_nombre: {response.get('publicar_nombre')}")
        return success

    def test_delete_vivienda(self):
        """Test deleting a vivienda"""
        if not self.vivienda_id:
            print("❌ No vivienda ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete Vivienda",
            "DELETE",
            f"edificios/my/viviendas/{self.vivienda_id}",
            200,
            token=self.edificio_admin_token
        )
        if success:
            print(f"   Message: {response.get('message')}")
        return success

    def test_public_edificio_view(self):
        """Test public edificio view"""
        if not self.edificio_slug:
            print("❌ No edificio slug available for public test")
            return False
            
        success, response = self.run_test(
            "Public Edificio View",
            "GET",
            f"public/edificios/{self.edificio_slug}",
            200
        )
        if success:
            print(f"   Edificio name: {response.get('nombre')}")
            print(f"   Viviendas count: {len(response.get('viviendas', []))}")
            # Check privacy functionality
            for vivienda in response.get('viviendas', []):
                print(f"   Vivienda #{vivienda.get('numero')}: {vivienda.get('nombre_familia')}")
        return success

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        success, _ = self.run_test(
            "Unauthorized Dashboard Access",
            "GET",
            "admin/dashboard",
            401  # Should fail without token
        )
        return success

    def test_edificio_admin_without_token(self):
        """Test edificio admin endpoints without token"""
        success, _ = self.run_test(
            "Edificio Admin Endpoint Without Token",
            "GET",
            "edificios/my",
            401  # Should fail without token
        )
        return success

    def test_delete_edificio(self):
        """Test deleting the created edificio"""
        if not self.edificio_id:
            print("❌ No edificio ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete Edificio",
            "DELETE",
            f"admin/edificios/{self.edificio_id}",
            200,
            token=self.super_admin_token
        )
        if success:
            print(f"   Message: {response.get('message')}")
        return success

    def test_nonexistent_public_edificio(self):
        """Test accessing non-existent public edificio"""
        success, _ = self.run_test(
            "Non-existent Public Edificio",
            "GET",
            "public/edificios/NONEXISTENT",
            404
        )
        return success

    def test_invalid_phone_format(self):
        """Test adding vivienda with invalid phone format"""
        vivienda_data = {
            "nombre_familia": "Test Invalid Phone",
            "phone": "123456789",  # Missing + prefix
            "publicar_nombre": True
        }
        
        success, _ = self.run_test(
            "Invalid Phone Format",
            "POST",
            "edificios/my/viviendas",
            422,  # Validation error
            data=vivienda_data,
            token=self.edificio_admin_token
        )
        return success

    def test_vivienda_create_user_reported(self):
        """Test creating vivienda with exact user reported data"""
        vivienda_data = {
            "nombre_familia": "Test Family",
            "phone": "972123456789",
            "publicar_nombre": True
        }
        
        success, response = self.run_test(
            "Create Vivienda (User Reported Data)",
            "POST",
            "edificios/my/viviendas",
            200,
            data=vivienda_data,
            token=self.edificio_admin_token
        )
        if success:
            self.vivienda_id = response.get('id')
            print(f"   Vivienda ID: {self.vivienda_id}")
            print(f"   Vivienda numero: {response.get('numero')}")
            print(f"   Nombre familia: {response.get('nombre_familia')}")
            print(f"   Phone: {response.get('phone')}")
            print(f"   Publicar nombre: {response.get('publicar_nombre')}")
        return success

    def test_vivienda_update_user_reported(self):
        """Test updating vivienda with exact user reported data"""
        if not self.vivienda_id:
            print("❌ No vivienda ID available for update test")
            return False
            
        updated_data = {
            "nombre_familia": "Updated Family",
            "phone": "972987654321",
            "publicar_nombre": True
        }
        
        success, response = self.run_test(
            "Update Vivienda (User Reported Data)",
            "PUT",
            f"edificios/my/viviendas/{self.vivienda_id}",
            200,
            data=updated_data,
            token=self.edificio_admin_token
        )
        if success:
            print(f"   Updated nombre: {response.get('nombre_familia')}")
            print(f"   Updated phone: {response.get('phone')}")
            print(f"   Updated publicar_nombre: {response.get('publicar_nombre')}")
        return success

def main():
    print("🏢 Sistema Intercomunicador - URGENT VIVIENDA TESTING")
    print("🚨 User reports error saving vivienda data (name and number)")
    print("=" * 60)
    
    tester = IntercomunicadorTester()
    
    # Test sequence - FOCUSED ON USER REPORTED VIVIENDA ISSUES
    tests = [
        # Authentication first
        ("Edificio Admin Login (diego@daf-il.net)", tester.test_edificio_admin_login),
        
        # URGENT USER REPORTED ISSUES - VIVIENDA ENDPOINTS
        ("Get My Edificios (Check existing)", tester.test_edificio_admin_my_edificio),
        ("Create Vivienda (User Reported Data)", tester.test_vivienda_create_user_reported),
        ("Update Vivienda (User Reported Data)", tester.test_vivienda_update_user_reported),
        ("Get My Edificios (Verify after changes)", tester.test_edificio_admin_my_edificio),
        
        # Additional vivienda validation tests
        ("Invalid Phone Format", tester.test_invalid_phone_format),
        
        # Cleanup
        ("Delete Vivienda", tester.test_delete_vivienda),
    ]
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
        
        # Small delay between tests
        time.sleep(0.5)
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())