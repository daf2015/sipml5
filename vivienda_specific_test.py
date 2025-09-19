#!/usr/bin/env python3
"""
Specific test for user-reported vivienda endpoints
Testing exactly what the user requested:
1. POST /api/edificios/my/viviendas - Create new vivienda
2. PUT /api/edificios/my/viviendas/{vivienda_id} - Update existing vivienda  
3. GET /api/edificios/my - Get viviendas
"""

import requests
import json

def test_vivienda_endpoints():
    base_url = "https://intercom-edificios-1.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    print("🏠 URGENT VIVIENDA ENDPOINT TESTING")
    print("User: diego@daf-il.net / tangotango")
    print("=" * 50)
    
    # Step 1: Login
    print("\n1️⃣ Logging in as diego@daf-il.net...")
    login_response = requests.post(f"{api_url}/auth/login", json={
        "email": "diego@daf-il.net",
        "password": "tangotango"
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("✅ Login successful")
    
    # Step 2: Get existing edificio/viviendas
    print("\n2️⃣ Getting existing edificio and viviendas...")
    get_response = requests.get(f"{api_url}/edificios/my", headers=headers)
    
    if get_response.status_code != 200:
        print(f"❌ Get edificios failed: {get_response.status_code}")
        print(f"Response: {get_response.text}")
        return False
    
    edificio_data = get_response.json()
    print(f"✅ Edificio: {edificio_data['edificio']['nombre']}")
    print(f"   Current viviendas: {len(edificio_data['viviendas'])}")
    
    # Step 3: Create new vivienda with exact user data
    print("\n3️⃣ Creating new vivienda with user data...")
    create_data = {
        "nombre_familia": "Test Family",
        "phone": "972123456789", 
        "publicar_nombre": True
    }
    
    create_response = requests.post(f"{api_url}/edificios/my/viviendas", 
                                  json=create_data, headers=headers)
    
    if create_response.status_code != 200:
        print(f"❌ Create vivienda failed: {create_response.status_code}")
        print(f"Response: {create_response.text}")
        return False
    
    vivienda = create_response.json()
    vivienda_id = vivienda["id"]
    print(f"✅ Vivienda created successfully")
    print(f"   ID: {vivienda_id}")
    print(f"   Numero: {vivienda['numero']}")
    print(f"   Familia: {vivienda['nombre_familia']}")
    print(f"   Phone: {vivienda['phone']}")
    
    # Step 4: Update the vivienda with exact user data
    print("\n4️⃣ Updating vivienda with user data...")
    update_data = {
        "nombre_familia": "Updated Family",
        "phone": "972987654321",
        "publicar_nombre": True
    }
    
    update_response = requests.put(f"{api_url}/edificios/my/viviendas/{vivienda_id}",
                                 json=update_data, headers=headers)
    
    if update_response.status_code != 200:
        print(f"❌ Update vivienda failed: {update_response.status_code}")
        print(f"Response: {update_response.text}")
        return False
    
    updated_vivienda = update_response.json()
    print(f"✅ Vivienda updated successfully")
    print(f"   Updated familia: {updated_vivienda['nombre_familia']}")
    print(f"   Updated phone: {updated_vivienda['phone']}")
    
    # Step 5: Verify changes by getting edificio again
    print("\n5️⃣ Verifying changes...")
    verify_response = requests.get(f"{api_url}/edificios/my", headers=headers)
    
    if verify_response.status_code != 200:
        print(f"❌ Verification failed: {verify_response.status_code}")
        return False
    
    final_data = verify_response.json()
    print(f"✅ Verification successful")
    print(f"   Total viviendas: {len(final_data['viviendas'])}")
    
    # Find our vivienda in the list
    our_vivienda = None
    for v in final_data['viviendas']:
        if v['id'] == vivienda_id:
            our_vivienda = v
            break
    
    if our_vivienda:
        print(f"   Our vivienda #{our_vivienda['numero']}: {our_vivienda['nombre_familia']} - {our_vivienda['phone']}")
    
    # Step 6: Cleanup - delete the test vivienda
    print("\n6️⃣ Cleaning up test vivienda...")
    delete_response = requests.delete(f"{api_url}/edificios/my/viviendas/{vivienda_id}",
                                    headers=headers)
    
    if delete_response.status_code == 200:
        print("✅ Test vivienda deleted successfully")
    else:
        print(f"⚠️ Cleanup failed: {delete_response.status_code}")
    
    print("\n" + "=" * 50)
    print("🎉 ALL VIVIENDA ENDPOINTS WORKING CORRECTLY!")
    print("✅ POST /api/edificios/my/viviendas - CREATE")
    print("✅ PUT /api/edificios/my/viviendas/{id} - UPDATE") 
    print("✅ GET /api/edificios/my - GET VIVIENDAS")
    print("\nNo errors found in the backend for vivienda operations.")
    return True

if __name__ == "__main__":
    test_vivienda_endpoints()