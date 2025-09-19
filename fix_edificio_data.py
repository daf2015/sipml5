#!/usr/bin/env python3
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_edificio_data():
    # MongoDB connection
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    # Fix the edificio data
    result = await db.edificios.update_one(
        {"slug": "edificio-niv-david-123"},
        {"$set": {
            "cantidad_viviendas": 20,  # Set correct number
            "admin_nombre": "Diego Fridman",  # Set admin name
            "admin_email": "diego@daf-il.net"  # Set correct email
        }}
    )
    
    if result.matched_count > 0:
        print("✅ Edificio data fixed successfully")
        print("   - cantidad_viviendas: 0 → 20")
        print("   - admin_nombre: '' → 'Diego Fridman'")
        print("   - admin_email: test@edificio.com → diego@daf-il.net")
    else:
        print("❌ Edificio not found")
    
    # Show current data
    edificio = await db.edificios.find_one({"slug": "edificio-niv-david-123"})
    if edificio:
        print(f"\n📋 Current edificio data:")
        print(f"   - Nombre: {edificio['nombre']}")
        print(f"   - Slug: {edificio['slug']}")
        print(f"   - Admin: {edificio['admin_nombre']} ({edificio['admin_email']})")
        print(f"   - Cantidad viviendas: {edificio['cantidad_viviendas']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_edificio_data())