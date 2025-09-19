#!/usr/bin/env python3
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_diego_user():
    # MongoDB connection
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    # Update diego@daf-il.net role and assign an edificio
    
    # First, find an available edificio that needs an admin
    edificios = await db.edificios.find().to_list(None)
    print("📋 Edificios disponibles:")
    for edificio in edificios:
        print(f"  - {edificio['nombre']} (ID: {edificio['id']}, Slug: {edificio['slug']})")
    
    # Let's assign diego to the first edificio
    if edificios:
        target_edificio = edificios[0]  # First edificio
        
        result = await db.users.update_one(
            {"email": "diego@daf-il.net"},
            {"$set": {
                "role": "edificio_admin",  # Correct role
                "edificio_id": target_edificio['id']  # Assign edificio
            }}
        )
        
        if result.matched_count > 0:
            print(f"✅ Diego updated successfully:")
            print(f"   - Role: building_admin → edificio_admin")
            print(f"   - Edificio: {target_edificio['nombre']}")
            print(f"   - Slug: {target_edificio['slug']}")
        else:
            print("❌ User not found")
    else:
        print("❌ No edificios available")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_diego_user())