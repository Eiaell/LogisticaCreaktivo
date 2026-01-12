#!/usr/bin/env node
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
    console.log("📋 Agregando columnas faltantes finales...\n");

    const finalColumns = [
      "cuenta_bancaria TEXT",
      "pedido_id TEXT"
    ];

    for (const columnDef of finalColumns) {
      const columnName = columnDef.split(' ')[0];
      try {
        await client.query(
          `ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS ${columnDef};`
        );
        console.log(`   ✓ ${columnName}`);
      } catch (err) {
        console.error(`   ✗ ${columnName}: ${err.message}`);
      }
    }

    console.log("\n✨ Schema final completado");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
