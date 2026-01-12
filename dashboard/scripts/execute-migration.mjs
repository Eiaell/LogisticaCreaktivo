#!/usr/bin/env node
/**
 * Migration script: Add 'banco' column to cotizaciones table
 * Uses direct PostgreSQL connection via DATABASE_URL
 */

import pkg from "pg";
const { Client } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");

// Load .env file manually
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error("❌ No .env file found at:", filePath);
    return {};
  }

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

if (!databaseUrl) {
  console.error("❌ Error: DATABASE_URL not found in .env");
  process.exit(1);
}

async function migrate() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
  });

  try {
    console.log("🚀 Conectando a base de datos...");
    await client.connect();
    console.log("✅ Conectado exitosamente");

    console.log("");
    console.log("📋 Ejecutando migración: agregar columna banco a cotizaciones...");

    // Execute the migration
    const result = await client.query(
      "ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS banco TEXT;"
    );

    console.log("✅ Migración ejecutada exitosamente");

    // Verify the column exists
    const verifyResult = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cotizaciones' AND column_name = 'banco';"
    );

    if (verifyResult.rows.length > 0) {
      console.log("✅ Columna 'banco' verificada en tabla 'cotizaciones'");
      console.log(
        `   Tipo: ${verifyResult.rows[0].data_type} | Nombre: ${verifyResult.rows[0].column_name}`
      );
      console.log("");
      console.log("✨ Sistema listo para guardar información de banco");
    } else {
      console.warn("⚠️  Columna 'banco' no encontrada después de migración");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error durante migración:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
