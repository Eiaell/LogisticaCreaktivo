-- 1. Crear tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  nombre TEXT PRIMARY KEY,
  ruc TEXT,
  direccion TEXT,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  notas TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla de Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  nombre TEXT PRIMARY KEY,
  contacto TEXT,
  telefono TEXT,
  direccion TEXT,
  notas TEXT,
  especialidad TEXT,
  factor_demora FLOAT DEFAULT 0,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  cliente_nombre TEXT, -- Vinculado al nombre del cliente
  vendedora TEXT,
  descripcion TEXT,
  estado TEXT DEFAULT 'en_produccion',
  precio FLOAT DEFAULT 0,
  pagado FLOAT DEFAULT 0,
  rq_numero TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla de Pagos (Adelantos)
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id TEXT REFERENCES pedidos(id) ON DELETE CASCADE,
  monto FLOAT DEFAULT 0,
  nota TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Deshabilitar RLS (Seguridad) para permitir la sincronización inicial
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagos DISABLE ROW LEVEL SECURITY;
