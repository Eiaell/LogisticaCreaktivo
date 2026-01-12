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

async function checkSchema() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("✅ Conectado a base de datos\n");

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("📋 Tablas en la base de datos:");
    tablesResult.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    console.log("");

    // Check specific tables for cotizaciones
    const targetTables = ['cotizaciones', 'variantes_cotizacion', 'historico_precios'];
    
    for (const tableName of targetTables) {
      const exists = tablesResult.rows.some(r => r.table_name === tableName);
      if (exists) {
        // Get columns for this table
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`\n📊 Tabla: ${tableName}`);
        console.log("   Columnas:");
        columnsResult.rows.forEach(row => {
          const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(required)';
          console.log(`      • ${row.column_name}: ${row.data_type} ${nullable}`);
        });
      } else {
        console.log(`\n❌ Tabla NO existe: ${tableName}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkSchema();
