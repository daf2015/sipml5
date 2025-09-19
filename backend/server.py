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
import re
from unidecode import unidecode

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
app = FastAPI(title="Sistema Intercomunicador API")
api_router = APIRouter(prefix="/api")

# Models
class UserRole:
    SUPER_ADMIN = "super_admin"
    EDIFICIO_ADMIN = "edificio_admin"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    role: str
    is_active: bool = True
    edificio_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = UserRole.EDIFICIO_ADMIN
    edificio_id: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Edificio(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    slug: str  # URL-friendly name personalizado
    admin_nombre: str = ""  # Nombre del administrador
    admin_email: str = ""  # Email del admin (se asigna después)
    cantidad_viviendas: int = 0  # Cantidad planificada de viviendas
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    viviendas_count: int = 0

class EdificioCreate(BaseModel):
    nombre: str
    slug_personalizado: str  # El slug que el usuario quiere (ej: bai123)
    admin_nombre: str  # Nombre completo del administrador
    cantidad_viviendas: int = Field(ge=1, le=50)  # Entre 1 y 50 viviendas
    
    @validator('nombre')
    def validate_nombre(cls, v):
        if len(v) < 3:
            raise ValueError('El nombre del edificio debe tener al menos 3 caracteres')
        return v
    
    @validator('slug_personalizado')
    def validate_slug_personalizado(cls, v):
        if len(v) < 3:
            raise ValueError('El nombre del link debe tener al menos 3 caracteres')
        # Solo permitir letras, números y guiones
        import re
        if not re.match(r'^[a-zA-Z0-9-]+$', v):
            raise ValueError('El nombre del link solo puede contener letras, números y guiones')
        return v.lower()
    
    @validator('admin_nombre')
    def validate_admin_nombre(cls, v):
        if len(v) < 2:
            raise ValueError('El nombre del administrador debe tener al menos 2 caracteres')
        return v

class Vivienda(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    edificio_id: str
    numero: int  # Número de vivienda (1, 2, 3, etc.)
    nombre_familia: str  # Nombre de persona o familia
    phone: str  # Número en formato internacional
    publicar_nombre: bool = True  # Checkbox para mostrar nombre públicamente
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ViviendaCreate(BaseModel):
    nombre_familia: str
    phone: str
    publicar_nombre: bool = True

    @validator('phone')
    def validate_phone(cls, v):
        # Basic validation for international format
        if not v.startswith('+'):
            raise ValueError('El número de teléfono debe empezar con +')
        if len(v) < 8 or len(v) > 15:
            raise ValueError('Formato de número telefónico inválido')
        return v

class ViviendaUpdate(BaseModel):
    nombre_familia: str
    phone: str
    publicar_nombre: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class EdificioPublic(BaseModel):
    nombre: str
    viviendas: List[dict]

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

def create_slug_from_name(nombre: str) -> str:
    """Create URL-friendly slug from edificio name"""
    # Convert to lowercase and remove accents
    slug = unidecode(nombre.lower())
    # Replace spaces and special chars with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Ensure minimum length
    if len(slug) < 3:
        slug = slug + ''.join(secrets.choice(string.digits) for _ in range(3 - len(slug)))
    return slug

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = serialize_doc(await db.users.find_one({"id": user_id}))
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert datetime strings back if needed
    if isinstance(user.get('created_at'), str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

async def get_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Acceso de Super Admin requerido")
    return current_user

async def get_edificio_admin_or_super(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.EDIFICIO_ADMIN]:
        raise HTTPException(status_code=403, detail="Acceso de administrador requerido")
    return current_user

# Initialize users on startup
async def create_initial_users():
    # Create super admin
    super_admin = await db.users.find_one({"email": "diegofridman@gmail.com"})
    if not super_admin:
        super_admin_data = {
            "id": str(uuid.uuid4()),
            "email": "diegofridman@gmail.com",
            "password": hash_password("tangotango"),
            "role": UserRole.SUPER_ADMIN,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(super_admin_data)
        print("Super admin creado: diegofridman@gmail.com / tangotango")
    
    # Create edificio admin
    edificio_admin = await db.users.find_one({"email": "diego@daf-il.net"})
    if not edificio_admin:
        edificio_admin_data = {
            "id": str(uuid.uuid4()),
            "email": "diego@daf-il.net",
            "password": hash_password("tangotango"),
            "role": UserRole.EDIFICIO_ADMIN,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(edificio_admin_data)
        print("Admin de edificio creado: diego@daf-il.net / tangotango")

# Auth endpoints
@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user_doc = serialize_doc(await db.users.find_one({"email": user_data.email}))
    if not user_doc or not verify_password(user_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not user_doc["is_active"]:
        raise HTTPException(status_code=401, detail="Cuenta inactiva")
    
    # Convert datetime strings back to datetime objects
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    access_token = create_access_token(data={"sub": user.id})
    
    return Token(access_token=access_token, user=user)

# Super Admin endpoints
@api_router.get("/admin/dashboard")
async def get_dashboard(current_user: User = Depends(get_super_admin)):
    edificios = serialize_docs(await db.edificios.find().to_list(None))
    users = serialize_docs(await db.users.find({"role": UserRole.EDIFICIO_ADMIN}).to_list(None))
    viviendas = serialize_docs(await db.viviendas.find().to_list(None))
    
    return {
        "total_edificios": len(edificios),
        "total_admins": len(users),
        "total_viviendas": len(viviendas),
        "edificios_activos": len([e for e in edificios if e.get("is_active", True)]),
        "edificios": edificios,
        "edificios_recientes": sorted(edificios, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    }

@api_router.post("/admin/edificios", response_model=Edificio)
async def create_edificio(edificio_data: EdificioCreate, current_user: User = Depends(get_super_admin)):
    # Create slug from name
    base_slug = create_slug_from_name(edificio_data.nombre)
    slug = base_slug
    counter = 1
    
    # Check for unique slug
    while await db.edificios.find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Check if admin email already has an edificio
    existing_admin = await db.users.find_one({"email": edificio_data.admin_email, "role": UserRole.EDIFICIO_ADMIN})
    if existing_admin and existing_admin.get("edificio_id"):
        raise HTTPException(status_code=400, detail="El administrador ya tiene un edificio asignado")
    
    edificio = Edificio(
        nombre=edificio_data.nombre,
        slug=slug,
        admin_email=edificio_data.admin_email,
        admin_nombre=edificio_data.admin_nombre,
        cantidad_viviendas=edificio_data.cantidad_viviendas
    )
    
    edificio_dict = edificio.dict()
    edificio_dict["created_at"] = edificio_dict["created_at"].isoformat()
    
    await db.edificios.insert_one(edificio_dict)
    
    # Create or update admin user
    if existing_admin:
        await db.users.update_one(
            {"email": edificio_data.admin_email},
            {"$set": {"edificio_id": edificio.id}}
        )
    else:
        # Generate random password for new admin
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": edificio_data.admin_email,
            "password": hash_password(temp_password),
            "role": UserRole.EDIFICIO_ADMIN,
            "edificio_id": edificio.id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print(f"Admin de edificio creado: {edificio_data.admin_email} / {temp_password}")
    
    return edificio

@api_router.delete("/admin/edificios/{edificio_id}")
async def delete_edificio(edificio_id: str, current_user: User = Depends(get_super_admin)):
    # Delete viviendas first
    await db.viviendas.delete_many({"edificio_id": edificio_id})
    
    # Delete edificio
    result = await db.edificios.delete_one({"id": edificio_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Deactivate admin user
    await db.users.update_one(
        {"edificio_id": edificio_id},
        {"$set": {"is_active": False, "edificio_id": None}}
    )
    
    return {"message": "Edificio eliminado exitosamente"}

# Edificio Admin endpoints
@api_router.get("/edificios/my")
async def get_my_edificio(current_user: User = Depends(get_edificio_admin_or_super)):
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super admin no tiene edificio específico")
    
    edificio = serialize_doc(await db.edificios.find_one({"id": current_user.edificio_id}))
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    viviendas = serialize_docs(await db.viviendas.find({"edificio_id": current_user.edificio_id}).sort("numero", 1).to_list(None))
    
    # Convert datetime strings back if needed
    if isinstance(edificio.get('created_at'), str):
        edificio['created_at'] = datetime.fromisoformat(edificio['created_at'])
    
    edificio_obj = Edificio(**edificio)
    edificio_obj.viviendas_count = len(viviendas)
    
    return {
        "edificio": edificio_obj,
        "viviendas": viviendas,
        "url_publica": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/{edificio['slug']}"
    }

@api_router.post("/edificios/my/viviendas", response_model=Vivienda)
async def add_vivienda(vivienda_data: ViviendaCreate, current_user: User = Depends(get_edificio_admin_or_super)):
    if current_user.role == UserRole.EDIFICIO_ADMIN and not current_user.edificio_id:
        raise HTTPException(status_code=400, detail="No hay edificio asignado")
    
    edificio_id = current_user.edificio_id if current_user.role == UserRole.EDIFICIO_ADMIN else None
    
    if current_user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=400, detail="Super admin debe especificar edificio")
    
    # Check vivienda limit (20 max)
    viviendas_count = await db.viviendas.count_documents({"edificio_id": edificio_id})
    if viviendas_count >= 20:
        raise HTTPException(status_code=400, detail="Máximo 20 viviendas por edificio")
    
    # Get next vivienda number
    last_vivienda = await db.viviendas.find_one(
        {"edificio_id": edificio_id}, 
        sort=[("numero", -1)]
    )
    next_numero = (last_vivienda["numero"] + 1) if last_vivienda else 1
    
    vivienda = Vivienda(
        edificio_id=edificio_id,
        numero=next_numero,
        nombre_familia=vivienda_data.nombre_familia,
        phone=vivienda_data.phone,
        publicar_nombre=vivienda_data.publicar_nombre
    )
    
    vivienda_dict = vivienda.dict()
    vivienda_dict["created_at"] = vivienda_dict["created_at"].isoformat()
    
    await db.viviendas.insert_one(vivienda_dict)
    return vivienda

@api_router.put("/edificios/my/viviendas/{vivienda_id}", response_model=Vivienda)
async def update_vivienda(vivienda_id: str, vivienda_data: ViviendaUpdate, current_user: User = Depends(get_edificio_admin_or_super)):
    update_data = {
        "nombre_familia": vivienda_data.nombre_familia,
        "phone": vivienda_data.phone,
        "publicar_nombre": vivienda_data.publicar_nombre
    }
    
    filter_query = {"id": vivienda_id}
    if current_user.role == UserRole.EDIFICIO_ADMIN:
        filter_query["edificio_id"] = current_user.edificio_id
    
    result = await db.viviendas.update_one(filter_query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    vivienda = serialize_doc(await db.viviendas.find_one({"id": vivienda_id}))
    if isinstance(vivienda.get('created_at'), str):
        vivienda['created_at'] = datetime.fromisoformat(vivienda['created_at'])
    
    return Vivienda(**vivienda)

@api_router.delete("/edificios/my/viviendas/{vivienda_id}")
async def delete_vivienda(vivienda_id: str, current_user: User = Depends(get_edificio_admin_or_super)):
    filter_query = {"id": vivienda_id}
    if current_user.role == UserRole.EDIFICIO_ADMIN:
        filter_query["edificio_id"] = current_user.edificio_id
    
    # Get vivienda info before deletion
    vivienda_to_delete = await db.viviendas.find_one(filter_query)
    if not vivienda_to_delete:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    result = await db.viviendas.delete_one(filter_query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    # Renumber remaining viviendas
    remaining_viviendas = await db.viviendas.find(
        {"edificio_id": vivienda_to_delete["edificio_id"]}, 
        sort=[("numero", 1)]
    ).to_list(None)
    
    for i, vivienda in enumerate(remaining_viviendas, 1):
        await db.viviendas.update_one(
            {"id": vivienda["id"]}, 
            {"$set": {"numero": i}}
        )
    
    return {"message": "Vivienda eliminada exitosamente"}

# Public endpoint (no auth required)
@api_router.get("/public/edificios/{slug}", response_model=EdificioPublic)
async def get_public_edificio(slug: str):
    edificio = serialize_doc(await db.edificios.find_one({"slug": slug, "is_active": True}))
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    viviendas = serialize_docs(await db.viviendas.find(
        {"edificio_id": edificio["id"], "is_active": True}
    ).sort("numero", 1).to_list(None))
    
    # Filter viviendas based on publicar_nombre setting
    viviendas_publicas = []
    for vivienda in viviendas:
        vivienda_data = {
            "id": vivienda["id"],
            "numero": vivienda["numero"],
            "phone": vivienda["phone"]
        }
        
        if vivienda.get("publicar_nombre", True):
            vivienda_data["nombre_familia"] = vivienda["nombre_familia"]
        else:
            vivienda_data["nombre_familia"] = "Residente"  # Default name when private
        
        viviendas_publicas.append(vivienda_data)
    
    return EdificioPublic(
        nombre=edificio["nombre"],
        viviendas=viviendas_publicas
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
    await create_initial_users()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)