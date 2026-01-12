#!/usr/bin/env node
/**
 * Complete Schema Migration
 * Creates variantes_cotizacion, historico_precios tables
 * and adds missing columns to cotizaciones table
 */

import pkg from "pg";
const { Client } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");

function loadEnv(filePath) {
  const envContent = fs.readFileSync(filePath, "utf-8");
  const env = {};
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      const trimmedKey = key.trim();
      const trimmedValue = valueParts.join("=").trim();
      if (trimmedKey && !trimmedKey.startsWith("#")) {
        env[trimmedKey] = trimmedValue;
      }
    }
  });
  return env;
}

const envVars = loadEnv(envPath);
const databaseUrl = envVars.DATABASE_URL;

async function migrate() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Conectado a base de datos\n");

    // 1. Add missing columns to cotizaciones table
    console.log("📋 Agregando columnas faltantes a tabla cotizaciones...");

    const missingColumns = [
      "descripcion TEXT",
      "fecha TIMESTAMP WITH TIME ZONE",
      "moneda VARCHAR(3) DEFAULT 'PEN'",
      "forma_pago VARCHAR(50)",
      "condiciones_pago_detalle TEXT",
      "tiempo_produccion INTEGER",
      "cci TEXT",
      "yape_plin TEXT",
      "prueba_color BOOLEAN DEFAULT false",
      "muestra_fisica BOOLEAN DEFAULT false",
      "estado VARCHAR(20) DEFAULT 'pendiente'",
      "vigencia_dias INTEGER",
      "incluye_igv BOOLEAN"
    ];

    for (const columnDef of missingColumns) {
      const columnName = columnDef.split(' ')[0];
      try {
        await client.query(
          `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS ${columnDef};`
        );
        console.log(`   ✓ ${columnName}`);
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log(`   ✓ ${columnName} (ya existe)`);
        } else {
          console.error(`   ✗ ${columnName}: ${err.message}`);
        }
      }
    }

    // 2. Create variantes_cotizacion table
    console.log("\n📋 Creando tabla variantes_cotizacion...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS variantes_cotizacion (
          id TEXT PRIMARY KEY,
          cotizacion_id TEXT NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
          producto_base VARCHAR(100) NOT NULL,
          variante TEXT,
          descripcion TEXT NOT NULL,
          cantidad INTEGER NOT NULL,
          precio_unitario DECIMAL(12,2) NOT NULL,
          precio_total DECIMAL(12,2) NOT NULL,
          incluye_igv BOOLEAN DEFAULT false,
          tiempo_produccion_dias INTEGER,
          tiempo_entrega_dias INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log("   ✓ Tabla variantes_cotizacion creada");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("   ✓ Tabla variantes_cotizacion ya existe");
      } else {
        console.error("   ✗ Error:", err.message);
      }
    }

    // 3. Create historico_precios table
    console.log("\n📋 Creando tabla historico_precios...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS historico_precios (
          id TEXT PRIMARY KEY,
          proveedor_id TEXT NOT NULL REFERENCES proveedores(nombre) ON DELETE CASCADE,
          producto_base VARCHAR(100) NOT NULL,
          descripcion TEXT NOT NULL,
          variante TEXT,
          precio_unitario DECIMAL(12,2) NOT NULL,
          incluye_igv BOOLEAN DEFAULT false,
          cantidad_referencia INTEGER,
          tiempo_produccion_dias INTEGER,
          tiempo_entrega_dias INTEGER,
          pedido_origen_id TEXT,
          cotizacion_origen_id TEXT REFERENCES cotizaciones(id),
          fecha_cotizacion TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      console.log("   ✓ Tabla historico_precios creada");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("   ✓ Tabla historico_precios ya existe");
      } else {
        console.error("   ✗ Error:", err.message);
      }
    }

    // 4. Verify schema
    console.log("\n✅ Verificando esquema final...");

    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('cotizaciones', 'variantes_cotizacion', 'historico_precios')
      ORDER BY table_name
    `);

    console.log("\n📊 Tablas verificadas:");
    tableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Get cotizaciones columns
    const cotColumnsCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'cotizaciones'
      ORDER BY ordinal_position
    `);

    console.log("\n📊 Columnas en tabla cotizaciones:");
    cotColumnsCheck.rows.forEach(row => {
      console.log(`   • ${row.column_name}: ${row.data_type}`);
    });

    console.log("\n✨ Migración completada exitosamente");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Error durante migración:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
