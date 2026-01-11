# Supabase Schema - Checkpoint: Clientes Listos

**Fecha:** 2026-01-11
**Rama:** `checkpoint-clientes-listos`
**Estado:** Clientes y gestión de logos completamente funcionales

## Descripción General

Este documento registra la estructura de Supabase en el checkpoint "Clientes Listos". En este punto:
- ✅ Sistema de clientes completo (individuales y grupos empresariales)
- ✅ Gestión de logos para clientes y grupos
- ✅ Sistema de proveedores
- ✅ Gestión básica de pedidos
- ✅ Sistema de pagos

---

## Script SQL Completo

```sql
-- 1. Limpiar (ADVERTENCIA: esto elimina datos!)
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;

-- 2. Crear tabla de Clientes (CORRECTA)
CREATE TABLE clientes (
  nombre TEXT PRIMARY KEY,
  razon_social TEXT,
  nombre_comercial TEXT,
  grupo_empresarial TEXT,
  grupo_empresarial_ruc TEXT,
  grupo_logo_url TEXT,
  proyecto TEXT,
  proyecto_codigo TEXT,
  ruc TEXT,
  direccion TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  terminos_comerciales TEXT,
  vendedor_asignado TEXT,
  estado TEXT DEFAULT 'activo',
  prioridad TEXT DEFAULT 'medio',
  tipo_cliente TEXT DEFAULT 'corporativo',
  notas TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de Proveedores
CREATE TABLE proveedores (
  nombre TEXT PRIMARY KEY,
  razon_social TEXT,
  ruc TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  categorias TEXT,
  especialidad TEXT,
  emite_factura BOOLEAN,
  incluye_igv BOOLEAN,
  forma_pago TEXT,
  tiempo_produccion INTEGER,
  tiempo_entrega INTEGER,
  minimo_produccion INTEGER,
  factor_demora FLOAT DEFAULT 0,
  notas TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla de Pedidos
CREATE TABLE pedidos (
  id TEXT PRIMARY KEY,
  cliente_nombre TEXT REFERENCES clientes(nombre),
  vendedora TEXT,
  descripcion TEXT,
  estado TEXT DEFAULT 'en_produccion',
  precio FLOAT DEFAULT 0,
  pagado FLOAT DEFAULT 0,
  rq_numero TEXT,
  fecha_compromiso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla de Pagos
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id TEXT REFERENCES pedidos(id) ON DELETE CASCADE,
  monto FLOAT DEFAULT 0,
  nota TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Crear tabla de Cotizaciones (para futuro)
CREATE TABLE IF NOT EXISTS cotizaciones (
  id TEXT PRIMARY KEY,
  proveedor_id TEXT REFERENCES proveedores(nombre),
  producto TEXT,
  cantidad INTEGER,
  precio_unitario FLOAT,
  tiempo_entrega INTEGER,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Deshabilitar RLS para permitir acceso público
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones DISABLE ROW LEVEL SECURITY;

-- 8. Verificar que todo está correcto
SELECT 'Tablas creadas correctamente' AS status;
```

---

## Tabla: `clientes`

| Campo | Tipo | Descripción | Notas |
|-------|------|-------------|-------|
| `nombre` | TEXT (PK) | Nombre único del cliente | Clave primaria usada en referencias |
| `razon_social` | TEXT | Razón social del cliente | Campo informativo |
| `nombre_comercial` | TEXT | Nombre comercial | Mostrado en UI |
| `grupo_empresarial` | TEXT | Grupo al que pertenece (si aplica) | NULL para clientes independientes |
| `grupo_empresarial_ruc` | TEXT | RUC del grupo | NULL para clientes independientes |
| `grupo_logo_url` | TEXT | Logo del grupo | Heredado por todos los miembros |
| `proyecto` | TEXT | Proyecto asociado | Ej: "Oficina Principal", "Proyecto A" |
| `proyecto_codigo` | TEXT | Código del proyecto | Identificador corto |
| `ruc` | TEXT | RUC del cliente | Dato fiscal |
| `direccion` | TEXT | Dirección comercial | - |
| `contacto` | TEXT | Persona de contacto | - |
| `telefono` | TEXT | Número de teléfono | - |
| `email` | TEXT | Correo electrónico | - |
| `terminos_comerciales` | TEXT | Términos acordados | Texto libre |
| `vendedor_asignado` | TEXT | Vendedor responsable | - |
| `estado` | TEXT | Estado del cliente | Default: 'activo' |
| `prioridad` | TEXT | Prioridad en pedidos | Default: 'medio' |
| `tipo_cliente` | TEXT | Tipo de cliente | Default: 'corporativo' |
| `notas` | TEXT | Notas internas | - |
| `logo_url` | TEXT | URL del logo en Supabase Storage | Subido desde interfaz |
| `created_at` | TIMESTAMP | Fecha de creación | Auto-generado |
| `updated_at` | TIMESTAMP | Fecha de última actualización | Auto-actualizado |

---

## Tabla: `proveedores`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `nombre` | TEXT (PK) | Nombre único del proveedor |
| `razon_social` | TEXT | Razón social |
| `ruc` | TEXT | RUC fiscal |
| `contacto` | TEXT | Persona de contacto |
| `telefono` | TEXT | Teléfono de contacto |
| `email` | TEXT | Email de contacto |
| `direccion` | TEXT | Dirección del proveedor |
| `categorias` | TEXT | Categorías de productos |
| `especialidad` | TEXT | Especialidad principal |
| `emite_factura` | BOOLEAN | ¿Emite facturas? |
| `incluye_igv` | BOOLEAN | ¿Los precios incluyen IGV? |
| `forma_pago` | TEXT | Formas de pago aceptadas |
| `tiempo_produccion` | INTEGER | Días de producción |
| `tiempo_entrega` | INTEGER | Días de entrega |
| `minimo_produccion` | INTEGER | Cantidad mínima |
| `factor_demora` | FLOAT | Factor de retraso (para cálculos) |
| `notas` | TEXT | Notas adicionales |
| `logo_url` | TEXT | URL del logo en Supabase Storage |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

---

## Tabla: `pedidos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT (PK) | ID único del pedido (ej: PED-001) |
| `cliente_nombre` | TEXT (FK) | Referencia a `clientes(nombre)` |
| `vendedora` | TEXT | Vendedora responsable |
| `descripcion` | TEXT | Descripción del pedido |
| `estado` | TEXT | Estado actual (cotizacion, aprobado, en_produccion, etc) |
| `precio` | FLOAT | Precio total del pedido |
| `pagado` | FLOAT | Monto pagado hasta el momento |
| `rq_numero` | TEXT | Número de RQ o referencia |
| `fecha_compromiso` | TIMESTAMP | Fecha prometida de entrega |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

---

## Tabla: `pagos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID (PK) | ID único del pago |
| `pedido_id` | TEXT (FK) | Referencia a `pedidos(id)` |
| `monto` | FLOAT | Monto pagado |
| `nota` | TEXT | Nota adicional |
| `fecha` | TIMESTAMP | Fecha del pago |

---

## Tabla: `cotizaciones`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT (PK) | ID único de la cotización |
| `proveedor_id` | TEXT (FK) | Referencia a `proveedores(nombre)` |
| `producto` | TEXT | Nombre del producto |
| `cantidad` | INTEGER | Cantidad cotizada |
| `precio_unitario` | FLOAT | Precio por unidad |
| `tiempo_entrega` | INTEGER | Días de entrega |
| `notas` | TEXT | Notas de la cotización |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

---

## Características Implementadas

### Clientes
- ✅ Crear cliente individual
- ✅ Crear grupo empresarial con múltiples razones sociales
- ✅ Editar datos del cliente
- ✅ Subir logo individual
- ✅ Subir logo de grupo
- ✅ Ver lista de clientes con logos
- ✅ Integración en "Nuevo Pedido" con visualización de logos

### Proveedores
- ✅ Crear proveedor
- ✅ Editar información
- ✅ Gestión de tiempos y precios

### Pedidos
- ⚠️ Sistema básico (próxima fase: líneas de producto)
- ⚠️ Estados simples (próxima fase: flujo completo)

---

## Notas Importantes

1. **Storage de Logos:**
   - Los logos se suben a `Supabase Storage` en bucket `logos/`
   - Las URLs se guardan en campos `logo_url` y `grupo_logo_url`
   - Formato: `https://[project-id].supabase.co/storage/v1/object/public/logos/[filename]`

2. **RLS Deshabilitado:**
   - Todas las tablas tienen RLS deshabilitado
   - Permite acceso público via anon key
   - En producción, considerar habilitar RLS

3. **Relaciones:**
   - `clientes` ← `pedidos` (1:N)
   - `pedidos` → `pagos` (1:N)
   - `proveedores` ← `cotizaciones` (1:N)

---

## Próximas Fases

Este checkpoint es el punto de retorno para la siguiente fase:
- **Fase 2:** Líneas de producto con variantes y historial de cambios
  - Nueva tabla: `lineas_pedido`
  - Nueva tabla: `cambios_pedido`
  - Estado "aprobado_pendiente_cambios"

---

**Guardado en rama:** `checkpoint-clientes-listos`
**Para restaurar a este punto:** `git checkout checkpoint-clientes-listos`
