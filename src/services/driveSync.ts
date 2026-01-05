// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Google Drive Sync Service (OAuth 2.0)
// ============================================

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const DRIVE_FOLDER_ID = '1osxg87XFyAPe-zOXRG1dsRi5v-VPiHsF';

interface OAuthCredentials {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * Authenticate with Google Drive using OAuth 2.0 tokens
 */
async function authenticate() {
  // Read credentials
  let credentials: OAuthCredentials;
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    credentials = JSON.parse(content);
  } catch (error) {
    console.error('[DriveSync] Error: credentials.json not found');
    throw new Error('credentials.json not found. Download OAuth credentials from Google Cloud Console.');
  }

  const clientCredentials = credentials.installed || credentials.web;
  if (!clientCredentials) {
    throw new Error('Invalid credentials.json format. Must be OAuth credentials (installed or web).');
  }

  const { client_id, client_secret, redirect_uris } = clientCredentials;
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Read token
  let token: TokenData;
  try {
    const tokenContent = await fs.readFile(TOKEN_PATH, 'utf-8');
    token = JSON.parse(tokenContent);
  } catch (error) {
    console.error('[DriveSync] Error: token.json not found');
    console.error('[DriveSync] Run "npm run auth" to authenticate first.');
    throw new Error('Not authenticated. Run "npm run auth" first.');
  }

  oauth2Client.setCredentials(token);

  // Refresh token if expired
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.refresh_token) {
      token.refresh_token = newTokens.refresh_token;
    }
    token.access_token = newTokens.access_token!;
    token.expiry_date = newTokens.expiry_date!;
    await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), 'utf-8');
    console.log('[DriveSync] Token refreshed and saved');
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFile(
  filePath: string,
  mimeType: string,
  name?: string
): Promise<string | null> {
  try {
    const drive = await authenticate();
    const fileName = name || path.basename(filePath);

    // Check if file already exists in folder
    const existingFiles = await drive.files.list({
      q: `name='${fileName}' and '${DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    const fileContent = await fs.readFile(filePath);

    if (existingFiles.data.files && existingFiles.data.files.length > 0) {
      // Update existing file
      const fileId = existingFiles.data.files[0].id!;
      await drive.files.update({
        fileId,
        media: {
          mimeType,
          body: require('stream').Readable.from(fileContent),
        },
      });
      console.log(`[DriveSync] Updated file: ${fileName} (${fileId})`);
      return fileId;
    } else {
      // Create new file
      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [DRIVE_FOLDER_ID],
        },
        media: {
          mimeType,
          body: require('stream').Readable.from(fileContent),
        },
        fields: 'id',
      });
      console.log(`[DriveSync] Uploaded new file: ${fileName} (${response.data.id})`);
      return response.data.id || null;
    }
  } catch (error: any) {
    // Log full error details for debugging
    console.error('[DriveSync] ========== ERROR ==========');
    console.error('[DriveSync] Code:', error.code);
    console.error('[DriveSync] Message:', error.message);
    if (error.response?.data?.error) {
      console.error('[DriveSync] API Error:', JSON.stringify(error.response.data.error, null, 2));
    }
    console.error('[DriveSync] ==============================');

    if (error.message?.includes('Not authenticated')) {
      console.error('[DriveSync] Run "npm run auth" to authenticate.');
    } else if (error.code === 401) {
      console.error('[DriveSync] Token expired or invalid. Run "npm run auth" to re-authenticate.');
    } else if (error.code === 403) {
      console.error('[DriveSync] Permission denied. Check folder permissions.');
    } else if (error.code === 404) {
      console.error('[DriveSync] Folder not found. Check DRIVE_FOLDER_ID.');
    }
    return null;
  }
}

/**
 * Sync knowledge base files to Google Drive
 */
export async function syncKnowledgeBase(): Promise<boolean> {
  const knowledgeBaseDir = path.join(process.cwd(), 'knowledge_base');
  const tracesDir = path.join(knowledgeBaseDir, 'traces');
  const graphsDir = path.join(knowledgeBaseDir, 'graphs');

  let success = true;

  try {
    // Get today's date
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Upload today's trace file
    const traceFile = path.join(tracesDir, `${dateStr}.jsonl`);
    try {
      await fs.access(traceFile);
      const traceId = await uploadFile(traceFile, 'application/json', `trace_${dateStr}.jsonl`);
      if (!traceId) success = false;
    } catch {
      console.log('[DriveSync] No trace file for today yet');
    }

    // Upload today's graph
    const graphFile = path.join(graphsDir, 'graph_today.html');
    try {
      await fs.access(graphFile);
      const graphId = await uploadFile(graphFile, 'text/html', `graph_${dateStr}.html`);
      if (!graphId) success = false;
    } catch {
      console.log('[DriveSync] No graph file yet');
    }

    console.log('[DriveSync] Sync completed');
    return success;
  } catch (error: any) {
    console.error('[DriveSync] Sync failed:', error.message);
    return false;
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  console.log('[DriveSync] Starting sync...');
  const success = await syncKnowledgeBase();
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}
