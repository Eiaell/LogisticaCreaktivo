// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Configuration Constants
// ============================================

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// API Keys (DeepSeek for entity extraction - OpenAI-compatible API)
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
export const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

// WhatsApp Configuration
export const FLACO_NUMERO = process.env.FLACO_NUMERO || '';
export const BOT_NAME = 'LogiBot';

// Google Drive Configuration
export const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || '';
export const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

// Paths
export const DATA_DIR = path.join(process.cwd(), 'data');
export const AUDIOS_DIR = path.join(DATA_DIR, 'audios');

// Database Files
export const DB_FILES = {
  pedidos: path.join(DATA_DIR, 'pedidos.json'),
  proveedores: path.join(DATA_DIR, 'proveedores.json'),
  acuerdos: path.join(DATA_DIR, 'acuerdos.json'),
  movilidad: path.join(DATA_DIR, 'movilidad.json'),
  gastos: path.join(DATA_DIR, 'gastos.json'),
  matrizCostos: path.join(DATA_DIR, 'matriz_costos.json'),
};

// Cron Configuration
export const REMINDER_CRON = '30 17 * * 1-6'; // 5:30 PM, Lunes a Sábado

// Matriz de Costos Iniciales (Lima)
export const RUTAS_FRECUENTES = [
  { origen: 'Oficina Miraflores', destino: 'La Victoria', costoCombi: 6.40, tiempoEstimado: 40, tiempoHoraPunta: 70 },
  { origen: 'Oficina Miraflores', destino: 'San Isidro', costoCombi: 3.20, tiempoEstimado: 15, tiempoHoraPunta: 30 },
  { origen: 'Oficina Miraflores', destino: 'San Borja', costoCombi: 4.50, tiempoEstimado: 25, tiempoHoraPunta: 45 },
  { origen: 'Oficina Miraflores', destino: 'Centro Lima', costoCombi: 6.40, tiempoEstimado: 50, tiempoHoraPunta: 90 },
  { origen: 'Oficina Miraflores', destino: 'Surquillo', costoCombi: 2.50, tiempoEstimado: 10, tiempoHoraPunta: 20 },
  { origen: 'Oficina Miraflores', destino: 'Barranco', costoCombi: 2.50, tiempoEstimado: 15, tiempoHoraPunta: 25 },
  { origen: 'Oficina Miraflores', destino: 'Surco', costoCombi: 4.00, tiempoEstimado: 20, tiempoHoraPunta: 40 },
  { origen: 'Oficina Miraflores', destino: 'San Juan de Lurigancho', costoCombi: 8.00, tiempoEstimado: 60, tiempoHoraPunta: 120 },
  { origen: 'Oficina Miraflores', destino: 'Callao', costoCombi: 7.00, tiempoEstimado: 50, tiempoHoraPunta: 90 },
  { origen: 'La Victoria', destino: 'Centro Lima', costoCombi: 3.20, tiempoEstimado: 20, tiempoHoraPunta: 40 },
  { origen: 'San Isidro', destino: 'La Victoria', costoCombi: 3.20, tiempoEstimado: 20, tiempoHoraPunta: 35 },
];

// Proveedores Conocidos (Iniciales)
export const PROVEEDORES_INICIALES = [
  {
    nombre: 'Hugo',
    especialidad: ['polos', 'bordados'],
    factorDemora: 0,
  },
];

// Clientes Frecuentes
export const CLIENTES_FRECUENTES = [
  'DHL',
  'Inmobiliaria X',
];

// Vendedoras
export const VENDEDORAS = ['Angélica', 'Johana', 'Natalia'] as const;

// Validation
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!DEEPSEEK_API_KEY) missing.push('DEEPSEEK_API_KEY');
  if (!FLACO_NUMERO) missing.push('FLACO_NUMERO');

  return {
    valid: missing.length === 0,
    missing,
  };
}
