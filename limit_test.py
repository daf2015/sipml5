#!/usr/bin/env python3
"""
Test to reproduce the exact user issue - hitting vivienda limit
"""

import requests
import json

def get_token():
    response = requests.post(
        "http://localhost:8001/api/auth/login",
        json={"email": "diego@daf-il.net", "password": "tangotango"}
    )
    return response.json()['access_token']

def get_edificio_state(token):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get("http://localhost:8001/api/edificios/my", headers=headers)
    return response.json()

def create_vivienda(token, nombre, phone):
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    data = {"nombre_familia": nombre, "phone": phone, "publicar_nombre": True}
    response = requests.post("http://localhost:8001/api/edificios/my/viviendas", json=data, headers=headers)
    return response.status_code, response.json() if response.status_code == 200 else response.text

def main():
    print("🔍 TESTING USER'S EXACT SCENARIO - HITTING VIVIENDA LIMIT")
    print("=" * 60)
    
    token = get_token()
    
    # Check current state
    data = get_edificio_state(token)
    edificio = data.get('edificio', {})
    viviendas = data.get('viviendas', [])
    
    print(f"Edificio: {edificio.get('nombre')}")
    print(f"Límite: {edificio.get('cantidad_viviendas')}")
    print(f"Actuales: {len(viviendas)}")
    print(f"Disponibles: {edificio.get('cantidad_viviendas', 0) - len(viviendas)}")
    
    # Fill up to the limit
    limit = edificio.get('cantidad_viviendas', 0)
    current = len(viviendas)
    
    created_ids = []
    
    print(f"\n🏠 Creando viviendas hasta el límite...")
    for i in range(current + 1, limit + 1):
        status, result = create_vivienda(token, f"Test {i}", f"{i:09d}")
        if status == 200:
            created_ids.append(result['id'])
            print(f"   ✅ Vivienda {i} creada - ID: {result['id'][:8]}...")
        else:
            print(f"   ❌ Error creando vivienda {i}: {result}")
            break
    
    # Now try to create one more (this should fail like user experiences)
    print(f"\n🚨 Intentando crear vivienda #{limit + 1} (debería fallar)...")
    status, result = create_vivienda(token, "Test Extra", "999999999")
    
    if status != 200:
        print(f"   ❌ FALLO ESPERADO: {result}")
        print("   🎯 ESTE ES EL ERROR QUE VE EL USUARIO!")
    else:
        print(f"   ⚠️  Inesperado: se creó la vivienda extra")
    
    # Cleanup
    print(f"\n🧹 Limpiando {len(created_ids)} viviendas de prueba...")
    headers = {'Authorization': f'Bearer {token}'}
    for vid in created_ids:
        requests.delete(f"http://localhost:8001/api/edificios/my/viviendas/{vid}", headers=headers)
        print(f"   ✅ Eliminada {vid[:8]}...")

if __name__ == "__main__":
    main()