# Instrucciones para probar el sistema con PostgreSQL

## 🔧 **Configuración requerida:**

### 1. **Instalar PostgreSQL**
- Descargar e instalar PostgreSQL desde: https://www.postgresql.org/download/
- Durante la instalación, recordar la contraseña del usuario `postgres`

### 2. **Crear la base de datos**
```sql
-- Conectarse a PostgreSQL como superusuario
psql -U postgres

-- Crear la base de datos
CREATE DATABASE tienda_virtual;

-- Salir de psql
\q

-- Ejecutar el script de la base de datos
psql -U postgres -d tienda_virtual -f database.sql
```

### 3. **Configurar variables de entorno**
Editar el archivo `.env`:
```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=tu_password_de_postgres
DB_NAME=tienda_virtual
DB_PORT=5432
DB_SSL=false
```

### 4. **Instalar dependencias y ejecutar**
```bash
cd c:\xampp\htdocs\tiendaVirtual_Arqui
npm install
npm start
```

### 5. **Acceder al sistema**
- Abrir navegador en: http://localhost:3000
- Dashboard principal con estadísticas
- Gestión de categorías: http://localhost:3000/categorias
- Gestión de clientes: http://localhost:3000/clientes

## ✅ **Funcionalidades disponibles:**

### **Dashboard:**
- Estadísticas en tiempo real
- Resumen de categorías, productos, clientes y ventas
- Alertas de stock bajo
- Últimas ventas registradas

### **Gestión de Categorías:**
- ✅ Crear, editar, ver y eliminar categorías
- ✅ Validación de nombres únicos
- ✅ Protección contra eliminación si tiene productos

### **Gestión de Clientes:**
- ✅ Registro de clientes con celular guatemalteco
- ✅ Validación de formato de teléfono (7XXXXXXX)
- ✅ Búsqueda por nombre, celular o correo
- ✅ Preparación para envío de catálogo por WhatsApp

## 🚀 **Próximos pasos:**
1. **Productos** - CRUD con relaciones a categorías
2. **Ventas** - Sistema completo de ventas
3. **Catálogo + WhatsApp** - Generación PDF y envío automático

## 🔍 **Datos de prueba incluidos:**
- 8 categorías (Electrónicos, Ropa, etc.)
- 16 productos con relaciones
- 10 clientes con números guatemaltecos
- 10 ventas de ejemplo con detalles