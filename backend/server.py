from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import secrets
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Helper function to convert MongoDB documents to dictionaries without ObjectId
def serialize_doc(doc):
    """Convert MongoDB document to dict, removing ObjectId"""
    if doc is None:
        return None
    # Remove the _id field and any other ObjectId fields
    if '_id' in doc:
        del doc['_id']
    return doc

def serialize_docs(docs):
    """Convert list of MongoDB documents to list of dicts"""
    return [serialize_doc(doc) for doc in docs]

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Building Intercom API")
api_router = APIRouter(prefix="/api")

# Models
class UserRole:
    SUPER_ADMIN = "super_admin"
    BUILDING_ADMIN = "building_admin"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    role: str
    is_active: bool = True
    building_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = UserRole.BUILDING_ADMIN
    building_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Building(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    admin_email: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    units_count: int = 0

class BuildingCreate(BaseModel):
    name: str
    admin_email: str

class Unit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    building_id: str
    name: str  # Nombre de persona o familia
    phone: str  # Número en formato internacional
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UnitCreate(BaseModel):
    name: str
    phone: str

    @validator('phone')
    def validate_phone(cls, v):
        # Basic validation for international format
        if not v.startswith('+'):
            raise ValueError('Phone number must start with +')
        if len(v) < 8 or len(v) > 15:
            raise ValueError('Invalid phone number length')
        return v

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class BuildingPublic(BaseModel):
    name: str
    units: List[dict]

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_slug() -> str:
    """Generate random 6-character slug"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

async def get_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user

async def get_building_admin_or_super(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Initialize super admin on startup
async def create_super_admin():
    super_admin = await db.users.find_one({"role": UserRole.SUPER_ADMIN})
    if not super_admin:
        super_admin_data = {
            "id": str(uuid.uuid4()),
            "email": "super@admin.com",
            "password": hash_password("admin123"),
            "role": UserRole.SUPER_ADMIN,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(super_admin_data)
        print("Super admin created: super@admin.com / admin123")

# Auth endpoints
@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not verify_password(user_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc["is_active"]:
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    # Convert datetime strings back to datetime objects
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, user=user)

# Super Admin endpoints
@api_router.get("/admin/dashboard")
async def get_dashboard(current_user: User = Depends(get_super_admin)):
    buildings = serialize_docs(await db.buildings.find().to_list(None))
    users = serialize_docs(await db.users.find({"role": UserRole.BUILDING_ADMIN}).to_list(None))
    units = serialize_docs(await db.units.find().to_list(None))
    
    return {
        "total_buildings": len(buildings),
        "total_admins": len(users),
        "total_units": len(units),
        "active_buildings": len([b for b in buildings if b.get("is_active", True)]),
        "buildings": buildings,
        "recent_buildings": sorted(buildings, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    }

@api_router.post("/admin/buildings", response_model=Building)
async def create_building(building_data: BuildingCreate, current_user: User = Depends(get_super_admin)):
    # Check if admin email already has a building
    existing_admin = await db.users.find_one({"email": building_data.admin_email, "role": UserRole.BUILDING_ADMIN})
    if existing_admin and existing_admin.get("building_id"):
        raise HTTPException(status_code=400, detail="Admin already has a building assigned")
    
    building = Building(
        name=building_data.name,
        slug=generate_slug(),
        admin_email=building_data.admin_email
    )
    
    building_dict = building.dict()
    building_dict["created_at"] = building_dict["created_at"].isoformat()
    
    await db.buildings.insert_one(building_dict)
    
    # Create or update admin user
    if existing_admin:
        await db.users.update_one(
            {"email": building_data.admin_email},
            {"$set": {"building_id": building.id}}
        )
    else:
        # Generate random password for new admin
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": building_data.admin_email,
            "password": hash_password(temp_password),
            "role": UserRole.BUILDING_ADMIN,
            "building_id": building.id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print(f"Building admin created: {building_data.admin_email} / {temp_password}")
    
    return building

@api_router.delete("/admin/buildings/{building_id}")
async def delete_building(building_id: str, current_user: User = Depends(get_super_admin)):
    # Delete units first
    await db.units.delete_many({"building_id": building_id})
    
    # Delete building
    result = await db.buildings.delete_one({"id": building_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Building not found")
    
    # Deactivate admin user
    await db.users.update_one(
        {"building_id": building_id},
        {"$set": {"is_active": False, "building_id": None}}
    )
    
    return {"message": "Building deleted successfully"}

# Building Admin endpoints
@api_router.get("/buildings/my")
async def get_my_building(current_user: User = Depends(get_building_admin_or_super)):
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super admin doesn't have a specific building")
    
    building = serialize_doc(await db.buildings.find_one({"id": current_user.building_id}))
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    units = serialize_docs(await db.units.find({"building_id": current_user.building_id}).to_list(None))
    
    # Convert datetime strings back if needed
    if isinstance(building.get('created_at'), str):
        building['created_at'] = datetime.fromisoformat(building['created_at'])
    
    building_obj = Building(**building)
    building_obj.units_count = len(units)
    
    return {
        "building": building_obj,
        "units": units,
        "qr_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/b/{building['slug']}"
    }

@api_router.post("/buildings/my/units", response_model=Unit)
async def add_unit(unit_data: UnitCreate, current_user: User = Depends(get_building_admin_or_super)):
    if current_user.role == UserRole.BUILDING_ADMIN and not current_user.building_id:
        raise HTTPException(status_code=400, detail="No building assigned")
    
    building_id = current_user.building_id if current_user.role == UserRole.BUILDING_ADMIN else None
    
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super admin must specify building")
    
    # Check unit limit (20 max)
    units_count = await db.units.count_documents({"building_id": building_id})
    if units_count >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 units per building")
    
    unit = Unit(
        building_id=building_id,
        name=unit_data.name,
        phone=unit_data.phone
    )
    
    unit_dict = unit.dict()
    unit_dict["created_at"] = unit_dict["created_at"].isoformat()
    
    await db.units.insert_one(unit_dict)
    return unit

@api_router.put("/buildings/my/units/{unit_id}", response_model=Unit)
async def update_unit(unit_id: str, unit_data: UnitCreate, current_user: User = Depends(get_building_admin_or_super)):
    update_data = {
        "name": unit_data.name,
        "phone": unit_data.phone
    }
    
    filter_query = {"id": unit_id}
    if current_user.role == UserRole.BUILDING_ADMIN:
        filter_query["building_id"] = current_user.building_id
    
    result = await db.units.update_one(filter_query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    unit = await db.units.find_one({"id": unit_id})
    if isinstance(unit.get('created_at'), str):
        unit['created_at'] = datetime.fromisoformat(unit['created_at'])
    
    return Unit(**unit)

@api_router.delete("/buildings/my/units/{unit_id}")
async def delete_unit(unit_id: str, current_user: User = Depends(get_building_admin_or_super)):
    filter_query = {"id": unit_id}
    if current_user.role == UserRole.BUILDING_ADMIN:
        filter_query["building_id"] = current_user.building_id
    
    result = await db.units.delete_one(filter_query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    return {"message": "Unit deleted successfully"}

# Public endpoint (no auth required)
@api_router.get("/public/buildings/{slug}", response_model=BuildingPublic)
async def get_public_building(slug: str):
    building = await db.buildings.find_one({"slug": slug, "is_active": True})
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    units = await db.units.find({"building_id": building["id"], "is_active": True}).to_list(None)
    
    return BuildingPublic(
        name=building["name"],
        units=[{"id": unit["id"], "name": unit["name"], "phone": unit["phone"]} for unit in units]
    )

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    await create_super_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)