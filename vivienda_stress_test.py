#!/usr/bin/env python3
"""
URGENT VIVIENDA STRESS TEST
Testing the exact user scenario: diego@daf-il.net creating multiple viviendas
"""

import requests
import json
import time
from datetime import datetime

class ViviendaStressTest:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.edificio_data = None
        
    def login(self):
        """Login as diego@daf-il.net"""
        print("🔐 Logging in as diego@daf-il.net...")
        
        response = requests.post(
            f"{self.api_url}/auth/login",
            json={"email": "diego@daf-il.net", "password": "tangotango"},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.token = data['access_token']
            print(f"✅ Login successful - Role: {data.get('user', {}).get('role')}")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def get_edificio_state(self):
        """Get current edificio state"""
        print("\n📋 Getting current edificio state...")
        
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(f"{self.api_url}/edificios/my", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            self.edificio_data = data.get('edificio', {})
            viviendas = data.get('viviendas', [])
            
            print(f"   Edificio: {self.edificio_data.get('nombre')}")
            print(f"   Max viviendas: {self.edificio_data.get('cantidad_viviendas')}")
            print(f"   Current viviendas: {len(viviendas)}")
            print(f"   Available slots: {self.edificio_data.get('cantidad_viviendas', 0) - len(viviendas)}")
            
            return data
        else:
            print(f"❌ Failed to get edificio: {response.status_code} - {response.text}")
            return None
    
    def create_vivienda(self, nombre, phone, attempt_num):
        """Create a single vivienda"""
        print(f"\n🏠 Creating vivienda {attempt_num}: {nombre} - {phone}")
        
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            "nombre_familia": nombre,
            "phone": phone,
            "publicar_nombre": True
        }
        
        start_time = time.time()
        response = requests.post(
            f"{self.api_url}/edificios/my/viviendas",
            json=data,
            headers=headers
        )
        end_time = time.time()
        
        print(f"   Response time: {end_time - start_time:.2f}s")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ SUCCESS - Vivienda #{result.get('numero')} created")
            print(f"   ID: {result.get('id')}")
            print(f"   Phone: {result.get('phone')}")
            return True, result
        else:
            print(f"   ❌ FAILED - Status: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Error text: {response.text}")
            return False, None
    
    def stress_test_consecutive_creations(self):
        """Test creating many viviendas consecutively"""
        print("\n🚨 STRESS TEST: CONSECUTIVE VIVIENDA CREATIONS")
        print("Testing the exact user scenario...")
        
        # Test data similar to user's scenario
        test_viviendas = [
            ("Test 1", "111111111"),
            ("Test 2", "222222222"), 
            ("Test 3", "333333333"),
            ("Familia Rodriguez", "501234567"),
            ("Familia Martinez", "502345678"),
            ("Familia Lopez", "503456789"),
            ("Familia Garcia", "504567890"),
            ("Familia Fernandez", "505678901"),
            ("Familia Gonzalez", "506789012"),
            ("Familia Perez", "507890123"),
        ]
        
        created_viviendas = []
        failed_attempts = []
        
        for i, (nombre, phone) in enumerate(test_viviendas, 1):
            success, result = self.create_vivienda(nombre, phone, i)
            
            if success:
                created_viviendas.append(result.get('id'))
            else:
                failed_attempts.append((i, nombre, phone))
                print(f"   🚨 FAILURE AT ATTEMPT {i} - This could be the user's issue!")
                break
            
            # Small delay between creations (like user would do)
            time.sleep(0.5)
        
        print(f"\n📊 RESULTS:")
        print(f"   ✅ Successful creations: {len(created_viviendas)}")
        print(f"   ❌ Failed attempts: {len(failed_attempts)}")
        
        if failed_attempts:
            print(f"   🚨 FIRST FAILURE at attempt {failed_attempts[0][0]}: {failed_attempts[0][1]}")
        
        return created_viviendas, failed_attempts
    
    def test_limit_boundary(self):
        """Test what happens at the vivienda limit"""
        if not self.edificio_data:
            return
            
        print(f"\n🔍 TESTING LIMIT BOUNDARY")
        
        # Get current state
        current_data = self.get_edificio_state()
        if not current_data:
            return
            
        current_count = len(current_data.get('viviendas', []))
        max_count = self.edificio_data.get('cantidad_viviendas', 0)
        
        print(f"   Current: {current_count}/{max_count}")
        
        if current_count >= max_count:
            print("   🚨 Already at limit - testing limit enforcement")
            success, result = self.create_vivienda("Limit Test", "999999999", "LIMIT")
            if not success:
                print("   ✅ Limit properly enforced")
            else:
                print("   ❌ Limit NOT enforced - this could be the issue!")
    
    def cleanup_test_viviendas(self, vivienda_ids):
        """Clean up created viviendas"""
        print(f"\n🧹 CLEANING UP {len(vivienda_ids)} TEST VIVIENDAS")
        
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        for vivienda_id in vivienda_ids:
            response = requests.delete(
                f"{self.api_url}/edificios/my/viviendas/{vivienda_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"   ✅ Deleted {vivienda_id[:8]}...")
            else:
                print(f"   ❌ Failed to delete {vivienda_id[:8]}...")

def main():
    print("🏢 URGENT VIVIENDA DEBUGGING - STRESS TEST")
    print("🚨 User: diego@daf-il.net reports 'Error al guardar vivienda' after first one")
    print("=" * 80)
    
    tester = ViviendaStressTest()
    
    # Login
    if not tester.login():
        return 1
    
    # Get initial state
    tester.get_edificio_state()
    
    # Run stress test
    created_ids, failed_attempts = tester.stress_test_consecutive_creations()
    
    # Test limit boundary
    tester.test_limit_boundary()
    
    # Final state check
    print("\n📊 FINAL STATE CHECK")
    tester.get_edificio_state()
    
    # Cleanup
    if created_ids:
        tester.cleanup_test_viviendas(created_ids)
    
    # Summary
    print("\n" + "=" * 80)
    print("🔍 DEBUGGING SUMMARY:")
    
    if not failed_attempts:
        print("✅ NO ISSUES FOUND - Multiple consecutive vivienda creations work perfectly")
        print("🤔 User's issue may be:")
        print("   - Frontend-related (not backend)")
        print("   - Network/connectivity issue")
        print("   - Browser-specific problem")
        print("   - Already resolved")
    else:
        print(f"❌ ISSUE REPRODUCED - Failed at attempt {failed_attempts[0][0]}")
        print("🚨 This is likely the cause of the user's issue!")
    
    return 0 if not failed_attempts else 1

if __name__ == "__main__":
    exit(main())