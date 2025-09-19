# CONFIGURACIÓN MONGODB ATLAS EMPRESARIAL

## Para Configurar MongoDB Atlas (Base de Datos en la Nube):

### 1. Crear Cuenta en MongoDB Atlas
- Ve a: https://www.mongodb.com/cloud/atlas
- Crea una cuenta empresarial
- Selecciona plan M2 o superior (para producción)

### 2. Crear Cluster Empresarial
- Región recomendada: US East (Virginia) para menor latencia global
- Configuración: M2 General Purpose (mínimo para producción)
- Backup automático: ACTIVADO
- Monitoring: ACTIVADO

### 3. Configurar Seguridad
- Database Access: Crear usuario con permisos readWrite
- Network Access: Agregar IP 0.0.0.0/0 (acceso global)
- Encryption at Rest: ACTIVADO

### 4. Obtener Connection String
El formato será:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>?retryWrites=true&w=majority
```

### 5. Actualizar Variables de Entorno
Reemplazar en /app/backend/.env:
```
MONGO_URL="mongodb+srv://admin:<password>@intercomunicador-cluster.xxxxx.mongodb.net/intercomunicador_prod?retryWrites=true&w=majority"
```

### COSTOS ESTIMADOS MONGODB ATLAS:
- M2 General Purpose: $57/mes (2GB RAM, 10GB Storage)
- M5 (recomendado para 1000+ edificios): $200/mes (8GB RAM, 40GB Storage)
- M10 (para escala masiva): $590/mes (16GB RAM, 80GB Storage)

### CARACTERÍSTICAS EMPRESARIALES INCLUIDAS:
✅ Backup automático cada 12 horas
✅ Monitoring y alertas 24/7
✅ Escalado automático
✅ Replicación multi-región
✅ Cifrado end-to-end
✅ 99.995% uptime SLA
✅ Soporte técnico 24/7

### ROI ESTIMADO PARA TU NEGOCIO:
- 1000 edificios × $6/mes = $6,000/mes ingresos
- Costo MongoDB Atlas M5: $200/mes
- Margen bruto: $5,800/mes (96.7%)
- Anual: $69,600 - $2,400 = $67,200 ganancia neta solo en BD