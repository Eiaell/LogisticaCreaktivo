// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Local Whisper Transcription Service (faster-whisper + CUDA)
// ============================================

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'transcribe.py');

/**
 * Transcribe audio using local faster-whisper with CUDA
 * @param audioBuffer - Buffer containing audio data
 * @param format - Audio format (default: 'ogg')
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  format: string = 'ogg'
): Promise<string> {
  // Create a temporary file
  const tempPath = path.join(process.cwd(), 'data', `temp_audio_${Date.now()}.${format}`);

  try {
    fs.writeFileSync(tempPath, audioBuffer);
    const transcription = await transcribeAudioFile(tempPath);
    return transcription;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Transcribe audio from file path using local Whisper
 * @param filePath - Path to audio file
 * @returns Transcribed text
 */
// Correcciones comunes de Whisper para nombres/palabras específicas del negocio
const CORRECCIONES: Record<string, string> = {
  'hubo': 'Hugo',
  'ugo': 'Hugo',
  'jugo': 'Hugo',
  'húgo': 'Hugo',
  'angelica': 'Angélica',
  'yohana': 'Johana',
  'johanna': 'Johana',
  'joana': 'Johana',
  'dhel': 'DHL',
  'de hache ele': 'DHL',
  'la victoria': 'La Victoria',
  'san isidro': 'San Isidro',
  'mira flores': 'Miraflores',
  // Cliente TYC - variantes comunes de Whisper
  't&c': 'TYC',
  't and c': 'TYC',
  'tnc': 'TYC',
  't n c': 'TYC',
  'tic': 'TYC',
  'tec': 'TYC',
  'tyc': 'TYC',
};

export function aplicarCorrecciones(texto: string): string {
  let resultado = texto;
  for (const [mal, bien] of Object.entries(CORRECCIONES)) {
    // Reemplazar con límites de palabra (case insensitive)
    const regex = new RegExp(`\\b${mal}\\b`, 'gi');
    resultado = resultado.replace(regex, bien);
  }
  return resultado;
}

export async function transcribeAudioFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('[Transcription] Starting local Whisper transcription...');

    // Usar ruta absoluta de Python (Anaconda) donde está instalado faster-whisper
    const python = spawn('D:/Anaconda/python.exe', [SCRIPT_PATH, filePath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        const transcripcionRaw = stdout.trim();
        const transcription = aplicarCorrecciones(transcripcionRaw);
        console.log('[Transcription] Successfully transcribed audio');
        if (transcripcionRaw !== transcription) {
          console.log('[Transcription] Correcciones aplicadas');
        }
        resolve(transcription);
      } else {
        console.error('[Transcription] Error:', stderr);
        reject(new Error(`Transcription failed: ${stderr}`));
      }
    });

    python.on('error', (error) => {
      console.error('[Transcription] Process error:', error);
      reject(new Error(`Failed to start transcription process: ${error.message}`));
    });
  });
}
