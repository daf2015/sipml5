#!/usr/bin/env python3
"""
Test frontend flow exactly like the React app does
"""
import requests
import time
import json

BASE_URL = "https://intercom-edificios-1.preview.emergentagent.com/api"

def test_frontend_flow():
    print("🔍 Testing exact frontend flow...")
    
    # Step 1: Login (like frontend does)
    print("\n1. Login...")
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "diego@daf-il.net", 
        "password": "tangotango"
    })
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return
    
    data = response.json()
    token = data['access_token']
    print(f"✅ Login successful, token: {token[:20]}...")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Step 2: Check if we have buildings (like frontend does)
    print("\n2. Checking existing buildings...")
    response = requests.get(f"{BASE_URL}/edificios/my", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}...")
    
    if response.status_code == 200:
        print("✅ Has buildings, would show dashboard")
    else:
        print("ℹ️ No buildings, would show create form")
    
    # Step 3: Create building (like frontend does)
    print("\n3. Creating building...")
    create_data = {
        "nombre": "Frontend Flow Test",
        "slug_personalizado": "frontend-flow-test", 
        "admin_nombre": "Frontend Test Admin",
        "cantidad_viviendas": 6
    }
    
    response = requests.post(f"{BASE_URL}/edificios/create-my", 
                           json=create_data, headers=headers)
    
    print(f"Create status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Building created successfully")
        print(f"Response: {response.text}")
    else:
        print(f"❌ Create failed: {response.text}")
        return
    
    # Step 4: Immediately fetch like frontend does (this is where problem might be)
    print("\n4. Immediately fetching buildings (like frontend)...")
    response = requests.get(f"{BASE_URL}/edificios/my", headers=headers)
    
    print(f"Fetch status: {response.status_code}")
    if response.status_code == 200:
        print("✅ Fetch successful immediately after create")
        data = response.json()
        print(f"Building name: {data.get('edificio', {}).get('nombre')}")
        print(f"Building viviendas: {data.get('edificio', {}).get('cantidad_viviendas')}")
    else:
        print(f"❌ Fetch failed: {response.text}")
        
        # Try with a small delay
        print("\n5. Trying with 1 second delay...")
        time.sleep(1)
        response = requests.get(f"{BASE_URL}/edificios/my", headers=headers)
        
        print(f"Delayed fetch status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Fetch successful with delay")
        else:
            print(f"❌ Still failed: {response.text}")

if __name__ == "__main__":
    test_frontend_flow()