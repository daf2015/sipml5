import requests
import sys
import json
from datetime import datetime
import time
import os

class IntercomunicadorTester:
    def __init__(self):
        # Use the production URL from frontend/.env
        frontend_env_path = "/app/frontend/.env"
        backend_url = "https://intercom-edificios-1.preview.emergentagent.com"
        
        if os.path.exists(frontend_env_path):
            with open(frontend_env_path, 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        backend_url = line.split('=', 1)[1].strip()
                        break
        
        self.base_url = backend_url
        self.api_url = f"{backend_url}/api"
        self.super_admin_token = None
        self.edificio_admin_token = None
        self.edificio_id = None
        self.edificio_slug = None
        self.vivienda_id = None
        self.baitzman_edificio_id = None
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

    def test_multiple_consecutive_viviendas(self):
        """URGENT: Test multiple consecutive vivienda creations - USER REPORTED ISSUE"""
        print("\n🚨 TESTING MULTIPLE CONSECUTIVE VIVIENDA CREATIONS")
        print("User reports: Can add ONE vivienda but then 'Error al guardar vivienda'")
        
        viviendas_data = [
            {"nombre_familia": "Test 1", "phone": "111111111", "publicar_nombre": True},
            {"nombre_familia": "Test 2", "phone": "222222222", "publicar_nombre": True},
            {"nombre_familia": "Test 3", "phone": "333333333", "publicar_nombre": True}
        ]
        
        created_viviendas = []
        all_success = True
        
        for i, vivienda_data in enumerate(viviendas_data, 1):
            print(f"\n--- Creating Vivienda {i} ---")
            success, response = self.run_test(
                f"Create Vivienda {i} (Consecutive Test)",
                "POST",
                "edificios/my/viviendas",
                200,
                data=vivienda_data,
                token=self.edificio_admin_token
            )
            
            if success:
                created_viviendas.append(response.get('id'))
                print(f"   ✅ Vivienda {i} created successfully")
                print(f"   ID: {response.get('id')}")
                print(f"   Numero: {response.get('numero')}")
                print(f"   Nombre: {response.get('nombre_familia')}")
                print(f"   Phone: {response.get('phone')}")
            else:
                print(f"   ❌ FAILED to create Vivienda {i} - THIS IS THE USER'S ISSUE!")
                all_success = False
                break
            
            # Small delay between creations
            time.sleep(1)
        
        # Check edificio state after creations
        print(f"\n--- Checking Edificio State After Creations ---")
        success, response = self.run_test(
            "Get My Edificio (After Multiple Creations)",
            "GET",
            "edificios/my",
            200,
            token=self.edificio_admin_token
        )
        
        if success:
            edificio_data = response.get('edificio', {})
            viviendas_list = response.get('viviendas', [])
            print(f"   Edificio cantidad_viviendas: {edificio_data.get('cantidad_viviendas')}")
            print(f"   Actual viviendas count: {len(viviendas_list)}")
            print(f"   Viviendas created in this test: {len(created_viviendas)}")
            
            if edificio_data.get('cantidad_viviendas') and len(viviendas_list) >= edificio_data.get('cantidad_viviendas'):
                print(f"   ⚠️  LIMIT REACHED: {len(viviendas_list)}/{edificio_data.get('cantidad_viviendas')}")
        
        # Store created IDs for cleanup
        self.created_vivienda_ids = created_viviendas
        
        return all_success

    def test_vivienda_limits_and_restrictions(self):
        """Test vivienda limits and restrictions"""
        print("\n🔍 TESTING VIVIENDA LIMITS AND RESTRICTIONS")
        
        # First get current edificio state
        success, response = self.run_test(
            "Get Current Edificio State",
            "GET",
            "edificios/my",
            200,
            token=self.edificio_admin_token
        )
        
        if not success:
            return False
            
        edificio_data = response.get('edificio', {})
        viviendas_list = response.get('viviendas', [])
        max_viviendas = edificio_data.get('cantidad_viviendas', 0)
        current_count = len(viviendas_list)
        
        print(f"   Current viviendas: {current_count}/{max_viviendas}")
        
        # Test duplicate phone numbers
        if viviendas_list:
            existing_phone = viviendas_list[0].get('phone', '+972501111111')
            duplicate_data = {
                "nombre_familia": "Duplicate Phone Test",
                "phone": existing_phone,
                "publicar_nombre": True
            }
            
            print(f"\n--- Testing Duplicate Phone: {existing_phone} ---")
            success, response = self.run_test(
                "Create Vivienda with Duplicate Phone",
                "POST",
                "edificios/my/viviendas",
                400,  # Should fail or succeed depending on business rules
                data=duplicate_data,
                token=self.edificio_admin_token
            )
        
        # Test if we're at the limit
        if current_count >= max_viviendas:
            print(f"\n--- Testing Limit Exceeded (Current: {current_count}, Max: {max_viviendas}) ---")
            limit_test_data = {
                "nombre_familia": "Limit Test",
                "phone": "+972509999999",
                "publicar_nombre": True
            }
            
            success, response = self.run_test(
                "Create Vivienda Beyond Limit",
                "POST",
                "edificios/my/viviendas",
                400,  # Should fail with limit error
                data=limit_test_data,
                token=self.edificio_admin_token
            )
            
            if not success:
                print("   ✅ Limit properly enforced")
                return True
            else:
                print("   ❌ Limit NOT enforced - this could be the issue!")
                return False
        
        return True

    def find_baitzman_edificio(self):
        """Find the Baitzman 163 edificio ID for super admin testing"""
        success, response = self.run_test(
            "Get All Edificios (Super Admin)",
            "GET",
            "admin/dashboard",
            200,
            token=self.super_admin_token
        )
        
        if success:
            edificios_recientes = response.get('edificios_recientes', [])
            for edificio in edificios_recientes:
                if 'baitzman' in edificio.get('nombre', '').lower() and '163' in edificio.get('nombre', ''):
                    self.baitzman_edificio_id = edificio.get('id')
                    print(f"   Found Baitzman 163 edificio ID: {self.baitzman_edificio_id}")
                    return True
            
            # If not found in recent, try to get edificio admin's edificio
            print("   Baitzman 163 not found in recent edificios, checking admin's edificio...")
            success2, response2 = self.run_test(
                "Get Admin Edificio",
                "GET",
                "edificios/my",
                200,
                token=self.edificio_admin_token
            )
            
            if success2:
                edificio_data = response2.get('edificio', {})
                if edificio_data.get('id'):
                    self.baitzman_edificio_id = edificio_data.get('id')
                    print(f"   Using admin's edificio ID: {self.baitzman_edificio_id}")
                    print(f"   Edificio name: {edificio_data.get('nombre')}")
                    return True
        
        return False

    def test_admin_update_cantidad_viviendas(self):
        """URGENT: Test admin updating cantidad de viviendas - USER REPORTED ISSUE"""
        print("\n🚨 TESTING ADMIN CANTIDAD VIVIENDAS UPDATE")
        print("User: diego@daf-il.net / tangotango")
        print("Data: {\"cantidad_viviendas\": 30}")
        
        # First get current state
        success, response = self.run_test(
            "Get Current Edificio State (Before Update)",
            "GET",
            "edificios/my",
            200,
            token=self.edificio_admin_token
        )
        
        if success:
            edificio_data = response.get('edificio', {})
            current_cantidad = edificio_data.get('cantidad_viviendas', 0)
            current_viviendas_count = len(response.get('viviendas', []))
            print(f"   Current cantidad_viviendas: {current_cantidad}")
            print(f"   Current actual viviendas: {current_viviendas_count}")
        
        # Test the update
        update_data = {"cantidad_viviendas": 30}
        success, response = self.run_test(
            "Admin Update Cantidad Viviendas",
            "PUT",
            "edificios/my/cantidad-viviendas",
            200,
            data=update_data,
            token=self.edificio_admin_token
        )
        
        if success:
            print(f"   Update response: {response.get('message')}")
            
            # Verify the change was applied
            success2, response2 = self.run_test(
                "Verify Update Applied",
                "GET",
                "edificios/my",
                200,
                token=self.edificio_admin_token
            )
            
            if success2:
                edificio_data = response2.get('edificio', {})
                new_cantidad = edificio_data.get('cantidad_viviendas', 0)
                print(f"   New cantidad_viviendas: {new_cantidad}")
                
                if new_cantidad == 30:
                    print("   ✅ UPDATE SUCCESSFUL - cantidad_viviendas changed to 30")
                    return True
                else:
                    print(f"   ❌ UPDATE FAILED - Expected 30, got {new_cantidad}")
                    return False
        
        return success

    def test_super_admin_update_cantidad_viviendas(self):
        """URGENT: Test super admin updating cantidad de viviendas - USER REPORTED ISSUE"""
        print("\n🚨 TESTING SUPER ADMIN CANTIDAD VIVIENDAS UPDATE")
        print("User: diegofridman@gmail.com / tangotango")
        print("Edificio: Baitzman 163")
        print("Data: {\"cantidad_viviendas\": 35}")
        
        if not self.baitzman_edificio_id:
            print("❌ No Baitzman edificio ID found")
            return False
        
        # First get current state
        success, response = self.run_test(
            "Get Edificio State (Super Admin - Before Update)",
            "GET",
            f"admin/edificios/{self.baitzman_edificio_id}",
            200,
            token=self.super_admin_token
        )
        
        if success:
            edificio_data = response.get('edificio', {})
            current_cantidad = edificio_data.get('cantidad_viviendas', 0)
            current_viviendas_count = len(response.get('viviendas', []))
            print(f"   Current cantidad_viviendas: {current_cantidad}")
            print(f"   Current actual viviendas: {current_viviendas_count}")
        
        # Test the update
        update_data = {"cantidad_viviendas": 35}
        success, response = self.run_test(
            "Super Admin Update Cantidad Viviendas",
            "PUT",
            f"admin/edificios/{self.baitzman_edificio_id}/cantidad-viviendas",
            200,
            data=update_data,
            token=self.super_admin_token
        )
        
        if success:
            print(f"   Update response: {response.get('message')}")
            
            # Verify the change was applied
            success2, response2 = self.run_test(
                "Verify Super Admin Update Applied",
                "GET",
                f"admin/edificios/{self.baitzman_edificio_id}",
                200,
                token=self.super_admin_token
            )
            
            if success2:
                edificio_data = response2.get('edificio', {})
                new_cantidad = edificio_data.get('cantidad_viviendas', 0)
                print(f"   New cantidad_viviendas: {new_cantidad}")
                
                if new_cantidad == 35:
                    print("   ✅ SUPER ADMIN UPDATE SUCCESSFUL - cantidad_viviendas changed to 35")
                    return True
                else:
                    print(f"   ❌ SUPER ADMIN UPDATE FAILED - Expected 35, got {new_cantidad}")
                    return False
        
        return success

    def test_data_structure_validation(self):
        """Test what data structure the backend expects vs what frontend might be sending"""
        print("\n🔍 TESTING DATA STRUCTURE VALIDATION")
        
        # Test various data formats that frontend might send
        test_cases = [
            ("Correct format", {"cantidad_viviendas": 25}, 200),
            ("String number", {"cantidad_viviendas": "25"}, 400),
            ("Missing field", {"cantidad": 25}, 400),
            ("Wrong field name", {"cantidad_vivienda": 25}, 400),
            ("Null value", {"cantidad_viviendas": None}, 400),
            ("Zero value", {"cantidad_viviendas": 0}, 400),
            ("Negative value", {"cantidad_viviendas": -5}, 400),
            ("Too high value", {"cantidad_viviendas": 100}, 400),
            ("Float value", {"cantidad_viviendas": 25.5}, 400),
        ]
        
        all_passed = True
        
        for test_name, data, expected_status in test_cases:
            print(f"\n--- Testing {test_name}: {data} ---")
            success, response = self.run_test(
                f"Data Structure Test: {test_name}",
                "PUT",
                "edificios/my/cantidad-viviendas",
                expected_status,
                data=data,
                token=self.edificio_admin_token
            )
            
            if not success:
                all_passed = False
                print(f"   ❌ {test_name} failed validation test")
            else:
                print(f"   ✅ {test_name} behaved as expected")
        
        return all_passed

    def test_edge_cases_cantidad_viviendas(self):
        """Test edge cases for cantidad viviendas updates"""
        print("\n🔍 TESTING EDGE CASES FOR CANTIDAD VIVIENDAS")
        
        # Get current state first
        success, response = self.run_test(
            "Get Current State for Edge Cases",
            "GET",
            "edificios/my",
            200,
            token=self.edificio_admin_token
        )
        
        if not success:
            return False
        
        edificio_data = response.get('edificio', {})
        current_viviendas_count = len(response.get('viviendas', []))
        print(f"   Current viviendas count: {current_viviendas_count}")
        
        # Test reducing below current viviendas count
        if current_viviendas_count > 0:
            print(f"\n--- Testing Reduce Below Current Count ({current_viviendas_count}) ---")
            reduce_data = {"cantidad_viviendas": max(1, current_viviendas_count - 1)}
            success, response = self.run_test(
                "Reduce Below Current Viviendas Count",
                "PUT",
                "edificios/my/cantidad-viviendas",
                400,  # Should fail
                data=reduce_data,
                token=self.edificio_admin_token
            )
            
            if success:
                print("   ❌ Should have failed - reducing below current count")
                return False
            else:
                print("   ✅ Correctly prevented reducing below current count")
        
        # Test boundary values
        boundary_tests = [
            ("Minimum valid", {"cantidad_viviendas": 1}, 200 if current_viviendas_count <= 1 else 400),
            ("Maximum valid", {"cantidad_viviendas": 50}, 200),
            ("Above maximum", {"cantidad_viviendas": 51}, 400),
        ]
        
        for test_name, data, expected_status in boundary_tests:
            print(f"\n--- Testing {test_name}: {data} ---")
            success, response = self.run_test(
                f"Boundary Test: {test_name}",
                "PUT",
                "edificios/my/cantidad-viviendas",
                expected_status,
                data=data,
                token=self.edificio_admin_token
            )
        
        return True

    def cleanup_test_viviendas(self):
        """Clean up viviendas created during testing"""
        if hasattr(self, 'created_vivienda_ids'):
            print(f"\n🧹 CLEANING UP {len(self.created_vivienda_ids)} TEST VIVIENDAS")
            for vivienda_id in self.created_vivienda_ids:
                success, response = self.run_test(
                    f"Delete Test Vivienda {vivienda_id[:8]}...",
                    "DELETE",
                    f"edificios/my/viviendas/{vivienda_id}",
                    200,
                    token=self.edificio_admin_token
                )
                if success:
                    print(f"   ✅ Deleted vivienda {vivienda_id[:8]}...")
                else:
                    print(f"   ❌ Failed to delete vivienda {vivienda_id[:8]}...")
        return True

def main():
    print("🏢 Sistema Intercomunicador - URGENT CANTIDAD VIVIENDAS UPDATE TESTING")
    print("🚨 USER REPORTS: Housing quantity update endpoints not working for admin or super admin")
    print("🔍 Testing specific endpoints:")
    print("   1. Admin: PUT /api/edificios/my/cantidad-viviendas")
    print("   2. Super Admin: PUT /api/admin/edificios/{edificio_id}/cantidad-viviendas")
    print("=" * 80)
    
    tester = IntercomunicadorTester()
    
    # Test sequence - FOCUSED ON USER'S SPECIFIC ISSUE
    tests = [
        # Authentication first
        ("🔐 Super Admin Login (diegofridman@gmail.com)", tester.test_super_admin_login),
        ("🔐 Edificio Admin Login (diego@daf-il.net)", tester.test_edificio_admin_login),
        
        # Find Baitzman 163 edificio
        ("🔍 Find Baitzman 163 Edificio ID", tester.find_baitzman_edificio),
        
        # Check current states
        ("📋 Get Admin Current Edificio State", tester.test_edificio_admin_my_edificio),
        
        # MAIN TESTS: Cantidad viviendas updates
        ("🚨 ADMIN UPDATE CANTIDAD VIVIENDAS", tester.test_admin_update_cantidad_viviendas),
        ("🚨 SUPER ADMIN UPDATE CANTIDAD VIVIENDAS", tester.test_super_admin_update_cantidad_viviendas),
        
        # Data structure validation
        ("🔍 Data Structure Validation", tester.test_data_structure_validation),
        
        # Edge cases
        ("🔍 Edge Cases Testing", tester.test_edge_cases_cantidad_viviendas),
        
        # Final verification
        ("📊 Final State Verification", tester.test_edificio_admin_my_edificio),
    ]
    
    # Run all tests
    for test_name, test_func in tests:
        print(f"\n{'='*80}")
        print(f"🧪 {test_name}")
        print('='*80)
        try:
            result = test_func()
            if result:
                print(f"✅ {test_name} - PASSED")
            else:
                print(f"❌ {test_name} - FAILED")
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Small delay between tests
        time.sleep(1)
    
    # Print results
    print("\n" + "=" * 80)
    print(f"📊 FINAL TEST RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Housing quantity update endpoints are working correctly.")
        return 0
    else:
        failed_count = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_count} tests failed - HOUSING QUANTITY UPDATE ISSUE CONFIRMED!")
        print("🔍 Check the failed tests above for the exact error causing the user's issue.")
        return 1

if __name__ == "__main__":
    sys.exit(main())