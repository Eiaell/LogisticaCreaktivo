#!/usr/bin/env npx tsx
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import open from 'open';

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function setupAuth() {
  console.log('🚀 Iniciando configuración de OAuth 2.0...');

  let credentials;
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    credentials = JSON.parse(content);
  } catch (error) {
    console.error('❌ Error: No se encontró credentials.json');
    process.exit(1);
  }

  const { client_id, client_secret } = credentials.installed || credentials.web;

  // Configuración con LOCALHOST
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost'
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\n👉 Abriendo navegador...');
  await open(authUrl);
  console.log('\n⚠️  INSTRUCCIONES:');
  console.log('1. Autoriza la app en el navegador.');
  console.log('2. Cuando salga la página de error (localhost), ¡NO CIERRES!');
  console.log('3. Copia la URL de la barra de direcciones.');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('\n📋 Pega la URL completa aquí: ', async (input) => {
    rl.close();
    let code = input.trim();
    if (code.includes('code=')) {
        code = decodeURIComponent(code.split('code=')[1].split('&')[0]);
    }
    
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('\n✅ ¡ÉXITO! Token guardado en token.json');
      console.log('Ahora ejecuta: npm run sync');
    } catch (error: any) {
      console.error('\n❌ Error obteniendo token:', error.message);
    }
  });
}

setupAuth();