# 🏢 Intercom App para Edificios - Sistema Completo v1.0

## 📋 Descripción General

Sistema completo de intercomunicación digital para edificios con funcionalidades avanzadas de CDR (Call Detail Records), gestión de usuarios y reportes detallados.

## 🎯 Características Principales

### ✅ **Sistema CDR Profesional**
- **Registro automático** de todas las llamadas desde la página pública
- **Filtros avanzados:** Edificio, Vivienda, Familia, Fechas (desde/hasta)
- **Resumen por edificios** con vista rápida de totales y ocupación
- **Descarga CSV** con filtros aplicados para análisis externos
- **Retención automática** de 3 meses (auto-eliminación con TTL MongoDB)
- **Tabla responsive** con paginación para grandes volúmenes de datos

### 👥 **Gestión de Usuarios**
- **Super Admin:** Gestión completa del sistema, acceso a todos los edificios
- **Admin de Edificio:** Gestión de hasta 21 viviendas por edificio
- **Autenticación JWT** con tokens de larga duración (30 días)

### 🏠 **Gestión de Edificios**
- Creación y gestión de edificios con slugs personalizados
- Límite configurable de viviendas por edificio
- Vista pública optimizada para móviles y tablets
- QR codes para acceso directo de visitantes

### 📊 **Analytics y Reportes**
- Estadísticas en tiempo real
- Reportes por edificio, vivienda y familia
- Métricas de ocupación y uso del sistema
- Exportación de datos en formato CSV

## 🏗️ Arquitectura Técnica

### **Backend (FastAPI)**
- **Framework:** FastAPI con Python 3.8+
- **Base de datos:** MongoDB con índices optimizados
- **Autenticación:** JWT con bcrypt
- **Validación:** Pydantic models
- **API:** RESTful con prefijo `/api`

### **Frontend (React)**
- **Framework:** React 18 con hooks
- **UI Components:** Shadcn UI + Tailwind CSS
- **Routing:** React Router DOM
- **Estado:** Context API para autenticación
- **Icons:** Lucide React

### **Base de Datos (MongoDB)**
- **Colecciones principales:**
  - `users` - Usuarios del sistema
  - `edificios` - Edificios registrados
  - `viviendas` - Viviendas por edificio
  - `call_detail_records` - Registros CDR con TTL de 3 meses

## 📁 Estructura del Proyecto

```
intercom-edificios/
├── backend/
│   ├── server.py          # API principal con todos los endpoints
│   ├── requirements.txt   # Dependencias Python
│   └── .env              # Variables de entorno (MongoDB, JWT)
├── frontend/
│   ├── src/
│   │   ├── App.js        # Componente principal con toda la lógica
│   │   ├── components/ui/ # Componentes Shadcn UI
│   │   └── hooks/        # Hooks personalizados
│   ├── package.json      # Dependencias React
│   └── .env             # URL del backend
├── scripts/              # Scripts de utilidad
├── tests/               # Tests del sistema
└── README.md           # Este archivo
```

## 🚀 Instalación y Configuración

### **1. Backend Setup**
```bash
cd backend/
pip install -r requirements.txt

# Configurar .env
MONGO_URL=mongodb://localhost:27017
DB_NAME=intercom_edificios
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
```

### **2. Frontend Setup**
```bash
cd frontend/
yarn install

# Configurar .env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### **3. Ejecutar el Sistema**
```bash
# Backend (Puerto 8001)
cd backend/
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (Puerto 3000)
cd frontend/
yarn start
```

## 📚 Endpoints API Principales

### **Autenticación**
- `POST /api/auth/login` - Login de usuarios
- `POST /api/auth/register` - Registro de nuevos usuarios

### **CDR (Call Detail Records)**
- `GET /api/admin/cdr` - Obtener registros CDR con filtros
- `GET /api/admin/cdr/stats` - Estadísticas generales
- `GET /api/admin/cdr/edificios-summary` - Resumen por edificios
- `GET /api/admin/cdr?formato=csv` - Descarga CSV

### **Gestión de Edificios**
- `GET /api/admin/dashboard` - Dashboard del Super Admin
- `POST /api/edificios/create-my` - Crear edificio
- `GET /api/edificios/my` - Obtener edificios del usuario
- `DELETE /api/edificios/my/{id}` - Eliminar edificio

### **Página Pública**
- `GET /api/public/edificios/{slug}` - Datos públicos del edificio
- `POST /api/public/edificios/{slug}/call/{vivienda_id}` - Registrar llamada

## 🎨 Funcionalidades del Frontend

### **Dashboard Super Admin**
- Vista general del sistema con estadísticas
- Gestión de todos los edificios
- Acceso directo al CDR detallado
- Crear nuevos edificios y administradores

### **Dashboard Admin de Edificio**
- Gestión de viviendas (crear, editar, eliminar)
- Vista en "casitas" responsive
- Copiar enlace público y generar QR
- Estadísticas del edificio

### **Página CDR**
- Tabla completa con todos los registros de llamadas
- Filtros por edificio, vivienda, familia y fechas
- Resumen visual por edificios con métricas
- Descarga CSV con filtros aplicados
- Paginación para grandes volúmenes

### **Página Pública**
- Vista optimizada para visitantes
- Grid responsive de viviendas
- Click-to-call con registro automático
- Compatible con WhatsApp y teléfono

## 🔒 Características de Seguridad

- **JWT Tokens** con expiración configurable
- **Roles y permisos** granulares
- **Validación de datos** con Pydantic
- **Protección de rutas** en frontend y backend
- **Sanitización** de inputs del usuario

## 📈 Características de Escalabilidad

- **MongoDB** con índices optimizados
- **Paginación** en todas las listas
- **TTL automático** para limpieza de datos
- **Pool de conexiones** para alta concurrencia
- **Componentes modulares** y reutilizables

## 🛠️ Mantenimiento y Monitoreo

### **Limpieza Automática**
- Los registros CDR se eliminan automáticamente después de 3 meses
- Índice TTL configurado en MongoDB

### **Logs y Debugging**
- Logging configurado por niveles (DEBUG/INFO/ERROR)
- Logs detallados para todas las operaciones críticas

## 🔧 Configuración Avanzada

### **Límites del Sistema**
- Máximo 5 edificios por admin de edificio
- Máximo 100 viviendas por edificio (configurable)
- Retención CDR: 3 meses (configurable)

### **Variables de Entorno**
```bash
# Backend
MONGO_URL=mongodb://localhost:27017
DB_NAME=intercom_edificios
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
ENVIRONMENT=production

# Frontend
REACT_APP_BACKEND_URL=https://your-domain.com
```

## 👥 Usuarios de Prueba

```javascript
// Super Admin
email: "diegofridman@gmail.com"
password: "tangotango"

// Admin de Edificio  
email: "diego@daf-il.net"
password: "tangotango"
```

## 🆕 Funcionalidades Implementadas v1.0

- ✅ Sistema CDR completo con filtros avanzados
- ✅ Resumen por edificios con métricas visuales
- ✅ Descarga CSV con filtros aplicados
- ✅ Retención automática de datos (3 meses)
- ✅ Interfaz responsive y moderna
- ✅ Registro automático de llamadas
- ✅ Dashboard para Super Admin y Admin de Edificio
- ✅ Página pública optimizada para visitantes
- ✅ Gestión completa de usuarios y permisos

## 📞 Soporte

Este sistema está listo para producción con todas las funcionalidades implementadas y probadas. 

Para soporte técnico o consultas sobre el código, contactar al desarrollador.

---

**Sistema desarrollado en Emergent AI Platform**  
**Versión:** 1.0.0  
**Fecha:** Septiembre 2025