from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
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
import asyncio
from pymongo import IndexModel

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# CONFIGURACIÓN EMPRESARIAL
class Config:
    MONGO_URL = os.environ['MONGO_URL']
    DB_NAME = os.environ['DB_NAME']
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
    ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 días
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # LÍMITES EMPRESARIALES
    MAX_EDIFICIOS_PER_ADMIN = 5  # Un admin puede tener hasta 5 edificios
    MAX_VIVIENDAS_PER_EDIFICIO = 100  # Hasta 100 viviendas por edificio
    MAX_SLUG_LENGTH = 50
    MIN_SLUG_LENGTH = 3

config = Config()

# Configuración de logging empresarial
logging.basicConfig(
    level=logging.INFO if config.ENVIRONMENT == 'production' else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection con pooling empresarial
client = AsyncIOMotorClient(
    config.MONGO_URL,
    maxPoolSize=50,  # Pool de conexiones para alta concurrencia
    minPoolSize=10,
    maxIdleTimeMS=30000,
    connectTimeoutMS=5000,
    serverSelectionTimeoutMS=5000
)
db = client[config.DB_NAME]

# Funciones de utilidad
def serialize_doc(doc):
    """Convert MongoDB document to dict, removing ObjectId"""
    if doc is None:
        return None
    if '_id' in doc:
        del doc['_id']
    return doc

def serialize_docs(docs):
    """Convert list of MongoDB documents to list of dicts"""
    return [serialize_doc(doc) for doc in docs]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# FastAPI app con configuración empresarial
app = FastAPI(
    title="Intercomunicador Enterprise API",
    description="Sistema empresarial de intercomunicación para edificios",
    version="1.0.0",
    docs_url="/docs" if config.ENVIRONMENT != 'production' else None,
    redoc_url="/redoc" if config.ENVIRONMENT != 'production' else None
)

api_router = APIRouter(prefix="/api")

# MODELOS EMPRESARIALES
class UserRole:
    SUPER_ADMIN = "super_admin"
    EDIFICIO_ADMIN = "edificio_admin"
    RESIDENT = "resident"  # Para futuro: residentes pueden tener su cuenta

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    role: str
    is_active: bool = True
    is_verified: bool = False  # Para verificación por email
    edificios_ids: List[str] = []  # Un admin puede tener múltiples edificios
    subscription_status: str = "free"  # free, paid, suspended
    subscription_expires: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    login_count: int = 0

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = UserRole.EDIFICIO_ADMIN

class UserLogin(BaseModel):
    email: str
    password: str

class Edificio(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nombre: str
    slug: str
    admin_id: str  # ID del usuario admin
    admin_nombre: str
    admin_email: str
    cantidad_viviendas: int
    is_active: bool = True
    is_premium: bool = False  # Para features premium
    subscription_status: str = "free"  # free, trial, paid, suspended
    subscription_expires: Optional[datetime] = None
    monthly_fee: float = 0.0  # Para tracking de ingresos
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Analytics empresariales
    total_calls: int = 0
    monthly_calls: int = 0
    last_call: Optional[datetime] = None

class EdificioCreate(BaseModel):
    nombre: str
    slug_personalizado: str
    admin_nombre: str
    cantidad_viviendas: int = Field(ge=1, le=config.MAX_VIVIENDAS_PER_EDIFICIO)
    
    @validator('nombre')
    def validate_nombre(cls, v):
        if len(v.strip()) < 3:
            raise ValueError('El nombre del edificio debe tener al menos 3 caracteres')
        if len(v.strip()) > 100:
            raise ValueError('El nombre del edificio no puede exceder 100 caracteres')
        return v.strip()
    
    @validator('slug_personalizado')
    def validate_slug_personalizado(cls, v):
        v = v.lower().strip()
        if len(v) < config.MIN_SLUG_LENGTH:
            raise ValueError(f'El slug debe tener al menos {config.MIN_SLUG_LENGTH} caracteres')
        if len(v) > config.MAX_SLUG_LENGTH:
            raise ValueError(f'El slug no puede exceder {config.MAX_SLUG_LENGTH} caracteres')
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('El slug solo puede contener letras minúsculas, números y guiones')
        if v.startswith('-') or v.endswith('-'):
            raise ValueError('El slug no puede empezar o terminar con guión')
        return v
    
    @validator('admin_nombre')
    def validate_admin_nombre(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('El nombre del administrador debe tener al menos 2 caracteres')
        return v.strip()

class Vivienda(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    edificio_id: str
    numero: int
    nombre_familia: str
    phone: str
    publicar_nombre: bool = True
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Analytics por vivienda
    
# MODELO CDR PARA CALL DETAIL RECORDS
class CallDetailRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    edificio_id: str
    edificio_nombre: str
    vivienda_id: str
    vivienda_numero: int
    vivienda_nombre_familia: str
    call_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    call_count: int = 0
    last_call: Optional[datetime] = None

class ViviendaCreate(BaseModel):
    nombre_familia: str
    phone: str
    publicar_nombre: bool = True

    @validator('nombre_familia')
    def validate_nombre_familia(cls, v):
        if len(v.strip()) < 1:
            raise ValueError('El nombre de la familia es requerido')
        if len(v.strip()) > 100:
            raise ValueError('El nombre no puede exceder 100 caracteres')
        return v.strip()

    @validator('phone')
    def validate_phone(cls, v):
        v = v.strip()
        # Permitir cualquier formato: números, letras, símbolos, URLs, extensiones, etc.
        if len(v) < 1:
            raise ValueError('El teléfono no puede estar vacío')
        if len(v) > 100:
            raise ValueError('El teléfono es demasiado largo')
        return v

class ViviendaUpdate(BaseModel):
    nombre_familia: str
    phone: str
    publicar_nombre: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
    expires_in: int

class EdificioPublic(BaseModel):
    nombre: str
    viviendas: List[dict]
    call_count: int = 0

# Funciones de seguridad empresarial
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_slug_from_name(nombre: str) -> str:
    """Create URL-friendly slug from edificio name"""
    slug = unidecode(nombre.lower())
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    if len(slug) < config.MIN_SLUG_LENGTH:
        slug = slug + ''.join(secrets.choice(string.digits) for _ in range(config.MIN_SLUG_LENGTH - len(slug)))
    return slug

# Middleware de autenticación
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, config.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    user = serialize_doc(await db.users.find_one({"id": user_id}))
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    if not user.get("is_active", False):
        raise HTTPException(status_code=401, detail="Cuenta inactiva")
    
    # Actualizar último login
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {"last_login": datetime.now(timezone.utc)},
            "$inc": {"login_count": 1}
        }
    )
    
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

# ENDPOINTS EMPRESARIALES

# Autenticación
@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user_doc = serialize_doc(await db.users.find_one({"email": user_data.email.lower()}))
    if not user_doc or not verify_password(user_data.password, user_doc["password"]):
        logger.warning(f"Failed login attempt for email: {user_data.email}")
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not user_doc.get("is_active", False):
        raise HTTPException(status_code=401, detail="Cuenta inactiva")
    
    # Convert datetime strings back to datetime objects
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    access_token = create_access_token(data={"sub": user.id})
    
    logger.info(f"Successful login for user: {user.email}")
    
    return Token(
        access_token=access_token, 
        user=user,
        expires_in=config.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

# Super Admin Dashboard Empresarial
@api_router.get("/admin/dashboard")
async def get_admin_dashboard(current_user: User = Depends(get_super_admin)):
    # Estadísticas empresariales
    total_edificios = await db.edificios.count_documents({})
    edificios_activos = await db.edificios.count_documents({"is_active": True})
    total_admins = await db.users.count_documents({"role": UserRole.EDIFICIO_ADMIN})
    total_viviendas = await db.viviendas.count_documents({})
    
    # Estadísticas de ingresos
    edificios_pagos = await db.edificios.find({"subscription_status": "paid"}).to_list(None)
    ingresos_mensuales = sum(e.get("monthly_fee", 0) for e in edificios_pagos)
    
    # Edificios recientes
    edificios_recientes = serialize_docs(
        await db.edificios.find().sort("created_at", -1).limit(10).to_list(None)
    )
    
    # Analytics de llamadas
    total_llamadas = sum(e.get("total_calls", 0) for e in serialize_docs(await db.edificios.find().to_list(None)))
    
    return {
        "total_edificios": total_edificios,
        "edificios_activos": edificios_activos,
        "total_admins": total_admins,
        "total_viviendas": total_viviendas,
        "ingresos_mensuales": ingresos_mensuales,
        "edificios_pagos": len(edificios_pagos),
        "total_llamadas": total_llamadas,
        "edificios_recientes": edificios_recientes
    }

# Super admin puede obtener datos de cualquier edificio para gestionarlo
@api_router.get("/admin/edificios/{edificio_id}")
async def get_edificio_for_admin(edificio_id: str, current_user: User = Depends(get_super_admin)):
    # Buscar edificio por ID
    edificio = await db.edificios.find_one({"id": edificio_id})
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Obtener viviendas
    viviendas = serialize_docs(
        await db.viviendas.find({"edificio_id": edificio_id}).sort("numero", 1).to_list(None)
    )
    
    edificio_serialized = serialize_doc(edificio)
    
    return {
        "edificio": edificio_serialized,
        "viviendas": viviendas,
        "url_publica": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/{edificio['slug']}"
    }

# Super admin puede agregar vivienda a cualquier edificio
@api_router.post("/admin/edificios/{edificio_id}/viviendas", response_model=Vivienda)
async def add_vivienda_admin(edificio_id: str, vivienda_data: ViviendaCreate, current_user: User = Depends(get_super_admin)):
    # Buscar edificio
    edificio = serialize_doc(await db.edificios.find_one({"id": edificio_id}))
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Verificar límite de viviendas
    viviendas_count = await db.viviendas.count_documents({"edificio_id": edificio_id})
    if viviendas_count >= edificio["cantidad_viviendas"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Límite máximo de {edificio['cantidad_viviendas']} viviendas para este edificio"
        )
    
    # Obtener siguiente número de vivienda
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
    vivienda_dict["last_updated"] = vivienda_dict["last_updated"].isoformat()
    
    await db.viviendas.insert_one(vivienda_dict)
    
    logger.info(f"Super admin agregó vivienda: {edificio['nombre']} - Vivienda {next_numero}")
    
    return vivienda

# Super admin puede actualizar vivienda de cualquier edificio
@api_router.put("/admin/viviendas/{vivienda_id}", response_model=Vivienda)
async def update_vivienda_admin(vivienda_id: str, vivienda_data: ViviendaUpdate, current_user: User = Depends(get_super_admin)):
    # Buscar vivienda
    vivienda = await db.viviendas.find_one({"id": vivienda_id})
    if not vivienda:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    # Actualizar
    update_data = {
        "nombre_familia": vivienda_data.nombre_familia,
        "phone": vivienda_data.phone,
        "publicar_nombre": vivienda_data.publicar_nombre,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    await db.viviendas.update_one(
        {"id": vivienda_id},
        {"$set": update_data}
    )
    
    # Retornar vivienda actualizada
    updated_vivienda = serialize_doc(await db.viviendas.find_one({"id": vivienda_id}))
    return Vivienda(**updated_vivienda)

# Super admin puede eliminar vivienda de cualquier edificio
@api_router.delete("/admin/viviendas/{vivienda_id}")
async def delete_vivienda_admin(vivienda_id: str, current_user: User = Depends(get_super_admin)):
    # Buscar vivienda
    vivienda = await db.viviendas.find_one({"id": vivienda_id})
    if not vivienda:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    # Eliminar
    await db.viviendas.delete_one({"id": vivienda_id})
    
    logger.info(f"Super admin eliminó vivienda: {vivienda_id}")
    
    return {"message": "Vivienda eliminada exitosamente"}

# Actualizar cantidad de viviendas - Admin de edificio
@api_router.put("/edificios/my/cantidad-viviendas")
async def update_cantidad_viviendas(
    nueva_cantidad: dict, 
    current_user: User = Depends(get_edificio_admin_or_super)
):
    cantidad = nueva_cantidad.get("cantidad_viviendas")
    if not cantidad or cantidad < 1 or cantidad > 50:
        raise HTTPException(status_code=400, detail="La cantidad de viviendas debe estar entre 1 y 50")
    
    # Buscar edificio del admin
    edificios = serialize_docs(
        await db.edificios.find({"admin_id": current_user.id}).to_list(None)
    )
    
    if not edificios:
        raise HTTPException(status_code=404, detail="No tienes edificios asignados")
    
    edificio = edificios[0]
    
    # Verificar que no se reduzca por debajo del número de viviendas existentes
    viviendas_existentes = await db.viviendas.count_documents({"edificio_id": edificio["id"]})
    if cantidad < viviendas_existentes:
        raise HTTPException(
            status_code=400, 
            detail=f"No puedes reducir a {cantidad} viviendas porque ya tienes {viviendas_existentes} viviendas creadas"
        )
    
    # Actualizar
    await db.edificios.update_one(
        {"id": edificio["id"]},
        {"$set": {"cantidad_viviendas": cantidad}}
    )
    
    logger.info(f"Admin {current_user.email} actualizó cantidad de viviendas a {cantidad}")
    
    return {"message": f"Cantidad de viviendas actualizada a {cantidad}"}

# Actualizar nombre del edificio - Admin de edificio
@api_router.put("/edificios/my/nombre")
async def update_nombre_edificio(
    nuevo_nombre: dict, 
    current_user: User = Depends(get_edificio_admin_or_super)
):
    nombre = nuevo_nombre.get("nombre", "").strip()
    if not nombre or len(nombre) < 2 or len(nombre) > 100:
        raise HTTPException(status_code=400, detail="El nombre debe tener entre 2 y 100 caracteres")
    
    # Buscar edificio del admin
    edificios = serialize_docs(
        await db.edificios.find({"admin_id": current_user.id}).to_list(None)
    )
    
    if not edificios:
        raise HTTPException(status_code=404, detail="No tienes edificios asignados")
    
    edificio = edificios[0]
    
    # Actualizar
    await db.edificios.update_one(
        {"id": edificio["id"]},
        {"$set": {"nombre": nombre}}
    )
    
    logger.info(f"Admin {current_user.email} actualizó nombre del edificio a '{nombre}'")
    
    return {"message": f"Nombre actualizado a '{nombre}'"}

# Actualizar nombre del edificio - Super admin
@api_router.put("/admin/edificios/{edificio_id}/nombre")
async def update_nombre_edificio_admin(
    edificio_id: str,
    nuevo_nombre: dict, 
    current_user: User = Depends(get_super_admin)
):
    nombre = nuevo_nombre.get("nombre", "").strip()
    if not nombre or len(nombre) < 2 or len(nombre) > 100:
        raise HTTPException(status_code=400, detail="El nombre debe tener entre 2 y 100 caracteres")
    
    # Buscar edificio
    edificio = await db.edificios.find_one({"id": edificio_id})
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Actualizar
    await db.edificios.update_one(
        {"id": edificio_id},
        {"$set": {"nombre": nombre}}
    )
    
    logger.info(f"Super admin actualizó nombre del edificio {edificio_id} a '{nombre}'")
    
    return {"message": f"Nombre actualizado a '{nombre}'"}

# Sistema CDR - Call Detail Records
@api_router.get("/admin/cdr")
async def get_call_detail_records(
    edificio_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_super_admin)
):
    """
    Obtener registros detallados de llamadas (CDR)
    Filtros: edificio_id, paginación
    Por defecto: último mes, máximo 3 meses de retención
    """
    # Filtro de fecha - último mes por defecto
    one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    # Query de filtros
    query = {"call_timestamp": {"$gte": one_month_ago}}
    if edificio_id:
        query["edificio_id"] = edificio_id
    
    # Obtener CDRs con paginación
    cdrs = serialize_docs(
        await db.call_detail_records.find(query)
        .sort("call_timestamp", -1)
        .skip(offset)
        .limit(limit)
        .to_list(length=None)
    )
    
    # Estadísticas
    total_records = await db.call_detail_records.count_documents(query)
    
    # Obtener lista de edificios para filtros
    edificios = serialize_docs(
        await db.edificios.find({}, {"id": 1, "nombre": 1}).to_list(None)
    )
    
    return {
        "cdrs": cdrs,
        "total_records": total_records,
        "has_more": (offset + limit) < total_records,
        "edificios_disponibles": edificios,
        "periodo": "último_mes"
    }

@api_router.get("/admin/cdr/stats")
async def get_cdr_statistics(current_user: User = Depends(get_super_admin)):
    """
    Estadísticas generales del CDR para el dashboard
    """
    one_month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    # Totales del último mes
    total_calls_month = await db.call_detail_records.count_documents({
        "call_timestamp": {"$gte": one_month_ago}
    })
    
    # Total histórico (últimos 3 meses)
    three_months_ago = datetime.now(timezone.utc) - timedelta(days=90)
    total_calls_historic = await db.call_detail_records.count_documents({
        "call_timestamp": {"$gte": three_months_ago}
    })
    
    # Edificios activos
    edificios_activos = await db.edificios.count_documents({"is_active": True})
    
    return {
        "total_llamadas_mes": total_calls_month,
        "total_llamadas_historico": total_calls_historic,
        "edificios_activos": edificios_activos
    }

# Actualizar cantidad de viviendas - Super admin
@api_router.put("/admin/edificios/{edificio_id}/cantidad-viviendas")
async def update_cantidad_viviendas_admin(
    edificio_id: str,
    nueva_cantidad: dict, 
    current_user: User = Depends(get_super_admin)
):
    cantidad = nueva_cantidad.get("cantidad_viviendas")
    if not cantidad or cantidad < 1 or cantidad > 50:
        raise HTTPException(status_code=400, detail="La cantidad de viviendas debe estar entre 1 y 50")
    
    # Buscar edificio
    edificio = await db.edificios.find_one({"id": edificio_id})
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Verificar que no se reduzca por debajo del número de viviendas existentes
    viviendas_existentes = await db.viviendas.count_documents({"edificio_id": edificio_id})
    if cantidad < viviendas_existentes:
        raise HTTPException(
            status_code=400, 
            detail=f"No puedes reducir a {cantidad} viviendas porque ya tienes {viviendas_existentes} viviendas creadas"
        )
    
    # Actualizar
    await db.edificios.update_one(
        {"id": edificio_id},
        {"$set": {"cantidad_viviendas": cantidad}}
    )
    
    logger.info(f"Super admin actualizó cantidad de viviendas del edificio {edificio_id} a {cantidad}")
    
    return {"message": f"Cantidad de viviendas actualizada a {cantidad}"}

# Crear edificio desde admin
@api_router.post("/admin/edificios", response_model=Edificio)
async def create_edificio_admin(edificio_data: EdificioCreate, current_user: User = Depends(get_super_admin)):
    # Verificar slug único
    slug_lower = edificio_data.slug_personalizado.lower()
    existing_edificio = await db.edificios.find_one({"slug": slug_lower})
    if existing_edificio:
        raise HTTPException(status_code=400, detail=f"El slug '{edificio_data.slug_personalizado}' ya está ocupado")
    
    edificio = Edificio(
        nombre=edificio_data.nombre,
        slug=slug_lower,
        admin_id=current_user.id,
        admin_nombre=edificio_data.admin_nombre,
        admin_email=current_user.email,
        cantidad_viviendas=edificio_data.cantidad_viviendas
    )
    
    edificio_dict = edificio.dict()
    edificio_dict["created_at"] = edificio_dict["created_at"].isoformat()
    edificio_dict["last_updated"] = edificio_dict["last_updated"].isoformat()
    
    await db.edificios.insert_one(edificio_dict)
    logger.info(f"Edificio creado por Super Admin: {edificio.nombre} ({edificio.slug})")
    
    return edificio

# Verificar disponibilidad de slug
@api_router.get("/edificios/check-slug/{slug}")
async def check_slug_availability(slug: str):
    slug_lower = slug.lower().strip()
    
    # Validaciones básicas
    if len(slug_lower) < config.MIN_SLUG_LENGTH:
        return {
            "available": False,
            "message": f"Mínimo {config.MIN_SLUG_LENGTH} caracteres",
            "suggestions": []
        }
    
    if not re.match(r'^[a-z0-9-]+$', slug_lower):
        return {
            "available": False,
            "message": "Solo letras, números y guiones",
            "suggestions": []
        }
    
    existing = await db.edificios.find_one({"slug": slug_lower})
    
    if existing:
        # Generar sugerencias inteligentes
        suggestions = []
        for i in range(1, 10):
            suggestion = f"{slug_lower}{i}"
            suggestion_exists = await db.edificios.find_one({"slug": suggestion})
            if not suggestion_exists:
                suggestions.append(suggestion)
                if len(suggestions) >= 3:
                    break
        
        return {
            "available": False,
            "message": f"El slug '{slug}' ya está ocupado",
            "suggestions": suggestions
        }
    
    return {
        "available": True,
        "message": f"El slug '{slug}' está disponible"
    }

# Admin de edificio crea su edificio
@api_router.post("/edificios/create-my", response_model=Edificio)
async def create_my_edificio(edificio_data: EdificioCreate, current_user: User = Depends(get_edificio_admin_or_super)):
    if current_user.role != UserRole.EDIFICIO_ADMIN:
        raise HTTPException(status_code=403, detail="Solo administradores de edificio pueden crear edificios")
    
    # Verificar límite de edificios por admin
    edificios_count = await db.edificios.count_documents({"admin_id": current_user.id})
    if edificios_count >= config.MAX_EDIFICIOS_PER_ADMIN:
        raise HTTPException(
            status_code=400, 
            detail=f"Límite máximo de {config.MAX_EDIFICIOS_PER_ADMIN} edificios por administrador"
        )
    
    # Verificar slug único
    slug_lower = edificio_data.slug_personalizado.lower()
    existing_edificio = await db.edificios.find_one({"slug": slug_lower})
    if existing_edificio:
        raise HTTPException(status_code=400, detail=f"El slug '{edificio_data.slug_personalizado}' ya está ocupado")
    
    edificio = Edificio(
        nombre=edificio_data.nombre,
        slug=slug_lower,
        admin_id=current_user.id,
        admin_nombre=edificio_data.admin_nombre,
        admin_email=current_user.email,
        cantidad_viviendas=edificio_data.cantidad_viviendas
    )
    
    edificio_dict = edificio.dict()
    edificio_dict["created_at"] = edificio_dict["created_at"].isoformat()
    edificio_dict["last_updated"] = edificio_dict["last_updated"].isoformat()
    
    await db.edificios.insert_one(edificio_dict)
    
    # Actualizar usuario con el nuevo edificio
    await db.users.update_one(
        {"id": current_user.id},
        {"$push": {"edificios_ids": edificio.id}}
    )
    
    logger.info(f"Edificio creado por admin: {current_user.email} - {edificio.nombre}")
    
    return edificio

# Eliminar edificio del admin
@api_router.delete("/edificios/my/{edificio_id}")
async def delete_my_edificio(edificio_id: str, current_user: User = Depends(get_edificio_admin_or_super)):
    if current_user.role == UserRole.SUPER_ADMIN:
        # Super admin puede eliminar cualquier edificio
        edificio = await db.edificios.find_one({"id": edificio_id})
    else:
        # Admin de edificio solo puede eliminar sus propios edificios
        edificio = await db.edificios.find_one({"id": edificio_id, "admin_id": current_user.id})
    
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Eliminar todas las viviendas del edificio
    viviendas_deleted = await db.viviendas.delete_many({"edificio_id": edificio_id})
    
    # Eliminar el edificio
    await db.edificios.delete_one({"id": edificio_id})
    
    # Actualizar usuario removiendo el edificio de su lista
    await db.users.update_one(
        {"id": current_user.id},
        {"$pull": {"edificios_ids": edificio_id}}
    )
    
    logger.info(f"Edificio eliminado: {edificio['nombre']} - Viviendas eliminadas: {viviendas_deleted.deleted_count}")
    
    return {
        "message": "Edificio eliminado exitosamente",
        "viviendas_eliminadas": viviendas_deleted.deleted_count
    }

# Obtener edificios del admin
@api_router.get("/edificios/my")
async def get_my_edificios(current_user: User = Depends(get_edificio_admin_or_super)):
    if current_user.role == UserRole.SUPER_ADMIN:
        # Super admin ve todos los edificios
        edificios = serialize_docs(
            await db.edificios.find().sort("created_at", -1).to_list(None)
        )
    else:
        # Admin de edificio ve solo sus edificios
        edificios = serialize_docs(
            await db.edificios.find({"admin_id": current_user.id}).sort("created_at", -1).to_list(None)
        )
    
    if not edificios:
        return {"edificios": [], "message": "No tienes edificios asignados"}
    
    # Por ahora retornamos el primer edificio para compatibilidad
    # TODO: Implementar manejo múltiple de edificios en frontend
    edificio = edificios[0]
    
    viviendas = serialize_docs(
        await db.viviendas.find({"edificio_id": edificio["id"]}).sort("numero", 1).to_list(None)
    )
    
    return {
        "edificio": edificio,
        "viviendas": viviendas,
        "url_publica": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/{edificio['slug']}"
    }

# CRUD de viviendas con validaciones empresariales
@api_router.post("/edificios/my/viviendas", response_model=Vivienda)
async def add_vivienda(vivienda_data: ViviendaCreate, current_user: User = Depends(get_edificio_admin_or_super)):
    # Obtener edificio del admin
    if current_user.role == UserRole.SUPER_ADMIN:
        # Para super admin, necesitamos especificar el edificio
        raise HTTPException(status_code=400, detail="Super admin debe especificar edificio")
    
    edificio = serialize_doc(await db.edificios.find_one({"admin_id": current_user.id}))
    if not edificio:
        raise HTTPException(status_code=404, detail="No tienes edificios asignados")
    
    # Verificar límite de viviendas
    viviendas_count = await db.viviendas.count_documents({"edificio_id": edificio["id"]})
    if viviendas_count >= edificio["cantidad_viviendas"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Límite máximo de {edificio['cantidad_viviendas']} viviendas para este edificio"
        )
    
    # Obtener siguiente número de vivienda
    last_vivienda = await db.viviendas.find_one(
        {"edificio_id": edificio["id"]}, 
        sort=[("numero", -1)]
    )
    next_numero = (last_vivienda["numero"] + 1) if last_vivienda else 1
    
    vivienda = Vivienda(
        edificio_id=edificio["id"],
        numero=next_numero,
        nombre_familia=vivienda_data.nombre_familia,
        phone=vivienda_data.phone,
        publicar_nombre=vivienda_data.publicar_nombre
    )
    
    vivienda_dict = vivienda.dict()
    vivienda_dict["created_at"] = vivienda_dict["created_at"].isoformat()
    vivienda_dict["last_updated"] = vivienda_dict["last_updated"].isoformat()
    
    await db.viviendas.insert_one(vivienda_dict)
    
    # Actualizar contador en edificio
    await db.edificios.update_one(
        {"id": edificio["id"]},
        {"$set": {"last_updated": datetime.now(timezone.utc)}}
    )
    
    logger.info(f"Vivienda agregada: {edificio['nombre']} - Vivienda {next_numero}")
    
    return vivienda

@api_router.put("/edificios/my/viviendas/{vivienda_id}", response_model=Vivienda)
async def update_vivienda(vivienda_id: str, vivienda_data: ViviendaUpdate, current_user: User = Depends(get_edificio_admin_or_super)):
    # Verificar que la vivienda pertenece al admin
    if current_user.role == UserRole.EDIFICIO_ADMIN:
        # Verificar que la vivienda pertenece a un edificio del admin
        edificio = await db.edificios.find_one({"admin_id": current_user.id})
        if not edificio:
            raise HTTPException(status_code=404, detail="No tienes edificios asignados")
        
        vivienda = await db.viviendas.find_one({"id": vivienda_id, "edificio_id": edificio["id"]})
    else:
        # Super admin puede editar cualquier vivienda
        vivienda = await db.viviendas.find_one({"id": vivienda_id})
    
    if not vivienda:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    update_data = {
        "nombre_familia": vivienda_data.nombre_familia,
        "phone": vivienda_data.phone,
        "publicar_nombre": vivienda_data.publicar_nombre,
        "last_updated": datetime.now(timezone.utc)
    }
    
    await db.viviendas.update_one({"id": vivienda_id}, {"$set": update_data})
    
    # Obtener vivienda actualizada
    updated_vivienda = serialize_doc(await db.viviendas.find_one({"id": vivienda_id}))
    
    if isinstance(updated_vivienda.get('created_at'), str):
        updated_vivienda['created_at'] = datetime.fromisoformat(updated_vivienda['created_at'])
    if isinstance(updated_vivienda.get('last_updated'), str):
        updated_vivienda['last_updated'] = datetime.fromisoformat(updated_vivienda['last_updated'])
    
    logger.info(f"Vivienda actualizada: ID {vivienda_id}")
    
    return Vivienda(**updated_vivienda)

@api_router.delete("/edificios/my/viviendas/{vivienda_id}")
async def delete_vivienda(vivienda_id: str, current_user: User = Depends(get_edificio_admin_or_super)):
    # Verificar que la vivienda pertenece al admin
    if current_user.role == UserRole.EDIFICIO_ADMIN:
        edificio = await db.edificios.find_one({"admin_id": current_user.id})
        if not edificio:
            raise HTTPException(status_code=404, detail="No tienes edificios asignados")
        
        vivienda_to_delete = await db.viviendas.find_one({"id": vivienda_id, "edificio_id": edificio["id"]})
    else:
        vivienda_to_delete = await db.viviendas.find_one({"id": vivienda_id})
    
    if not vivienda_to_delete:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    # Eliminar vivienda
    await db.viviendas.delete_one({"id": vivienda_id})
    
    # Renumerar viviendas restantes
    remaining_viviendas = await db.viviendas.find(
        {"edificio_id": vivienda_to_delete["edificio_id"]}, 
        sort=[("numero", 1)]
    ).to_list(None)
    
    for i, vivienda in enumerate(remaining_viviendas, 1):
        await db.viviendas.update_one(
            {"id": vivienda["id"]}, 
            {"$set": {"numero": i, "last_updated": datetime.now(timezone.utc)}}
        )
    
    logger.info(f"Vivienda eliminada y renumeradas: ID {vivienda_id}")
    
    return {"message": "Vivienda eliminada exitosamente"}

# Endpoint público con analytics
@api_router.get("/public/edificios/{slug}", response_model=EdificioPublic)
async def get_public_edificio(slug: str, background_tasks: BackgroundTasks):
    edificio = serialize_doc(await db.edificios.find_one({"slug": slug, "is_active": True}))
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    viviendas = serialize_docs(
        await db.viviendas.find(
            {"edificio_id": edificio["id"], "is_active": True}
        ).sort("numero", 1).to_list(None)
    )
    
    # Filtrar viviendas según configuración de privacidad
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
            vivienda_data["nombre_familia"] = "Residente"
        
        viviendas_publicas.append(vivienda_data)
    
    # NO registrar analytics aquí - solo se registra cuando hay llamada real
    
    return EdificioPublic(
        nombre=edificio["nombre"],
        viviendas=viviendas_publicas,
        call_count=edificio.get("total_calls", 0)
    )

# Registrar llamada (para analytics)
@api_router.post("/public/edificios/{slug}/call/{vivienda_id}")
async def register_call(slug: str, vivienda_id: str, background_tasks: BackgroundTasks):
    # Verificar que exista el edificio y la vivienda
    edificio = await db.edificios.find_one({"slug": slug, "is_active": True})
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    vivienda = await db.viviendas.find_one({"id": vivienda_id, "edificio_id": edificio["id"]})
    if not vivienda:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    
    # Registrar analytics en background
    background_tasks.add_task(update_call_analytics, edificio["id"], vivienda_id)
    
    return {"message": "Llamada registrada", "phone": vivienda["phone"]}

# Funciones de analytics empresariales
async def update_edificio_analytics(edificio_id: str):
    """Actualizar analytics del edificio"""
    await db.edificios.update_one(
        {"id": edificio_id},
        {
            "$inc": {"monthly_calls": 1, "total_calls": 1},
            "$set": {"last_call": datetime.now(timezone.utc)}
        }
    )

async def update_call_analytics(edificio_id: str, vivienda_id: str):
    """Actualizar analytics de llamadas y crear registro CDR"""
    now = datetime.now(timezone.utc)
    
    # Obtener datos del edificio y vivienda para el CDR
    edificio = await db.edificios.find_one({"id": edificio_id})
    vivienda = await db.viviendas.find_one({"id": vivienda_id})
    
    if edificio and vivienda:
        # Crear registro CDR
        cdr_record = {
            "id": str(uuid.uuid4()),
            "edificio_id": edificio_id,
            "edificio_nombre": edificio["nombre"],
            "vivienda_id": vivienda_id,
            "vivienda_numero": vivienda["numero"],
            "vivienda_nombre_familia": vivienda["nombre_familia"],
            "call_timestamp": now,
            "created_at": now
        }
        
        await db.call_detail_records.insert_one(cdr_record)
    
    # Actualizar edificio
    await db.edificios.update_one(
        {"id": edificio_id},
        {
            "$inc": {"monthly_calls": 1, "total_calls": 1},
            "$set": {"last_call": now}
        }
    )
    
    # Actualizar vivienda
    await db.viviendas.update_one(
        {"id": vivienda_id},
        {
            "$inc": {"call_count": 1},
            "$set": {"last_call": now}
        }
    )

# Crear índices empresariales
async def create_indexes():
    """Crear índices para optimización de queries"""
    try:
        # Índices para usuarios
        await db.users.create_index("email", unique=True)
        await db.users.create_index("role")
        await db.users.create_index("is_active")
        
        # Índices para edificios
        await db.edificios.create_index("slug", unique=True)
        await db.edificios.create_index("admin_id")
        await db.edificios.create_index("is_active")
        await db.edificios.create_index("subscription_status")
        
        # Índices para viviendas
        await db.viviendas.create_index([("edificio_id", 1), ("numero", 1)], unique=True)
        await db.viviendas.create_index("edificio_id")
        await db.viviendas.create_index("is_active")
        
        # Índices para CDR
        await db.call_detail_records.create_index("call_timestamp")
        await db.call_detail_records.create_index("edificio_id")
        await db.call_detail_records.create_index([("edificio_id", 1), ("call_timestamp", -1)])
        
        # Índice TTL para auto-eliminación después de 3 meses (90 días)
        await db.call_detail_records.create_index(
            "call_timestamp", 
            expireAfterSeconds=90 * 24 * 60 * 60  # 90 días en segundos
        )
        
        logger.info("Índices empresariales y CDR creados exitosamente")
    except Exception as e:
        logger.error(f"Error creando índices: {e}")

# Inicializar datos de prueba empresariales
async def create_initial_data():
    """Crear datos iniciales para el sistema empresarial"""
    # Crear super admin
    super_admin = await db.users.find_one({"email": "diegofridman@gmail.com"})
    if not super_admin:
        super_admin_data = {
            "id": str(uuid.uuid4()),
            "email": "diegofridman@gmail.com",
            "password": hash_password("tangotango"),
            "role": UserRole.SUPER_ADMIN,
            "is_active": True,
            "is_verified": True,
            "subscription_status": "paid",
            "edificios_ids": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(super_admin_data)
        logger.info("Super admin creado: diegofridman@gmail.com")
    
    # Crear admin de edificio de prueba
    edificio_admin = await db.users.find_one({"email": "diego@daf-il.net"})
    if not edificio_admin:
        edificio_admin_data = {
            "id": str(uuid.uuid4()),
            "email": "diego@daf-il.net",
            "password": hash_password("tangotango"),
            "role": UserRole.EDIFICIO_ADMIN,
            "is_active": True,
            "is_verified": True,
            "subscription_status": "trial",
            "edificios_ids": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(edificio_admin_data)
        logger.info("Admin de edificio creado: diego@daf-il.net")

# Include router
app.include_router(api_router)

# CORS empresarial
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check empresarial
@app.get("/health")
async def health_check():
    try:
        # Verificar conexión a base de datos
        await db.command("ping")
        return {
            "status": "healthy",
            "environment": config.ENVIRONMENT,
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Eventos de startup y shutdown
@app.on_event("startup")
async def startup_event():
    logger.info(f"Iniciando Intercomunicador Enterprise API - Ambiente: {config.ENVIRONMENT}")
    await create_indexes()
    await create_initial_data()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Cerrando conexiones de base de datos")
    client.close()

# Configurar logging
if config.ENVIRONMENT == "production":
    logging.getLogger("uvicorn.access").handlers = []