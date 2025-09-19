#!/usr/bin/env python3
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

async def fix_admin_password():
    # MongoDB connection
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    # Password context
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Update diego@daf-il.net password to "tangotango"
    hashed_password = pwd_context.hash("tangotango")
    
    result = await db.users.update_one(
        {"email": "diego@daf-il.net"},
        {"$set": {"password": hashed_password}}
    )
    
    if result.matched_count > 0:
        print("✅ Password updated successfully for diego@daf-il.net")
    else:
        print("❌ User diego@daf-il.net not found")
    
    # Check current users
    users = await db.users.find().to_list(None)
    print(f"\n📋 Current users in database:")
    for user in users:
        print(f"  - {user['email']} ({user['role']}) - edificio_id: {user.get('edificio_id', 'None')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_admin_password())