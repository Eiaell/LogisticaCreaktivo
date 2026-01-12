#!/usr/bin/env node
/**
 * Migration script: Add 'banco' column to cotizaciones table
 * Loads .env manually for Node.js execution
 */

import { createClient } from "@supabase/supabase-js";
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
const supabaseUrl = envVars.VITE_SUPABASE_URL;
const anonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("❌ Error: faltan credenciales de Supabase en .env");
  console.error("VITE_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("VITE_SUPABASE_ANON_KEY:", anonKey ? "✓" : "✗");
  console.error("Ubicación de .env:", envPath);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function migrate() {
  try {
    console.log("🚀 Verificando estructura de tabla cotizaciones...");

    // Intentar insertar una cotización de prueba con el campo banco
    // para ver si la columna existe
    const { error: checkError } = await supabase
      .from("cotizaciones")
      .select("banco")
      .limit(1);

    if (
      checkError &&
      checkError.code === "PGRST116" &&
      checkError.message.includes("banco")
    ) {
      console.log('⚠️  Columna "banco" no existe en cotizaciones');
      console.log("");
      console.log(
        "📋 La anon_key no tiene permisos para crear columnas via SQL."
      );
      console.log("");
      console.log("⚠️  Debes ejecutar manualmente en Supabase SQL Editor:");
      console.log("");
      console.log(
        '  ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS banco TEXT;'
      );
      console.log("");
      console.log("Pasos:");
      console.log("1. Abre https://app.supabase.com/project/ujrhxbwmfylaemkmgwqi");
      console.log("2. Ve a SQL Editor en el menú izquierdo");
      console.log("3. Pega la consulta anterior");
      console.log("4. Haz clic en Run");
      console.log("");
      process.exit(0);
    }

    if (checkError) {
      console.error("❌ Error al verificar:", checkError.message);
      process.exit(1);
    }

    console.log('✅ Columna "banco" ya existe en cotizaciones');
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

migrate();
