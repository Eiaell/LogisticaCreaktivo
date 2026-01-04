// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Google Drive Integration Service
// ============================================

import { google, drive_v3 } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { GOOGLE_CREDENTIALS_PATH, GOOGLE_DRIVE_FOLDER_ID } from '../config/constants';
import { exportarDiaComoTexto } from './daily-storage';

let drive: drive_v3.Drive | null = null;

/**
 * Initialize Google Drive client
 */
export async function initializeDrive(): Promise<void> {
  if (!GOOGLE_CREDENTIALS_PATH) {
    console.log('[Drive] No credentials path configured, skipping Drive integration');
    return;
  }

  try {
    const credentials = JSON.parse(await fs.readFile(GOOGLE_CREDENTIALS_PATH, 'utf-8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    drive = google.drive({ version: 'v3', auth });
    console.log('[Drive] Google Drive client initialized');

  } catch (error) {
    console.error('[Drive] Failed to initialize:', error);
  }
}

/**
 * Check if Drive is available
 */
export function isDriveAvailable(): boolean {
  return drive !== null && GOOGLE_DRIVE_FOLDER_ID !== '';
}

/**
 * Upload or update a JSON file in Google Drive
 */
export async function syncJsonToDrive(filename: string, data: unknown): Promise<string | null> {
  if (!isDriveAvailable()) {
    return null;
  }

  try {
    const content = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(content, 'utf-8');

    // Check if file already exists
    const existingFile = await findFileByName(filename);

    if (existingFile) {
      // Update existing file
      await drive!.files.update({
        fileId: existingFile.id!,
        media: {
          mimeType: 'application/json',
          body: require('stream').Readable.from(buffer),
        },
      });
      console.log(`[Drive] Updated ${filename}`);
      return existingFile.id!;

    } else {
      // Create new file
      const response = await drive!.files.create({
        requestBody: {
          name: filename,
          parents: [GOOGLE_DRIVE_FOLDER_ID],
          mimeType: 'application/json',
        },
        media: {
          mimeType: 'application/json',
          body: require('stream').Readable.from(buffer),
        },
      });
      console.log(`[Drive] Created ${filename}`);
      return response.data.id!;
    }

  } catch (error) {
    console.error(`[Drive] Error syncing ${filename}:`, error);
    return null;
  }
}

/**
 * Download a JSON file from Google Drive
 */
export async function downloadJsonFromDrive<T>(filename: string): Promise<T | null> {
  if (!isDriveAvailable()) {
    return null;
  }

  try {
    const file = await findFileByName(filename);
    if (!file || !file.id) {
      return null;
    }

    const response = await drive!.files.get({
      fileId: file.id,
      alt: 'media',
    });

    return response.data as T;

  } catch (error) {
    console.error(`[Drive] Error downloading ${filename}:`, error);
    return null;
  }
}

/**
 * Upload an audio file to Google Drive
 */
export async function uploadAudioToDrive(
  localPath: string,
  drivePath: string
): Promise<string | null> {
  if (!isDriveAvailable()) {
    return null;
  }

  try {
    const fileBuffer = await fs.readFile(localPath);
    const filename = path.basename(drivePath);

    // Create or get audio subfolder
    let audiosFolderId = await findOrCreateFolder('audios', GOOGLE_DRIVE_FOLDER_ID);

    // Get month subfolder
    const monthFolder = path.dirname(drivePath).split(path.sep).pop() || '';
    if (monthFolder) {
      audiosFolderId = await findOrCreateFolder(monthFolder, audiosFolderId);
    }

    // Upload file
    const response = await drive!.files.create({
      requestBody: {
        name: filename,
        parents: [audiosFolderId],
        mimeType: 'audio/ogg',
      },
      media: {
        mimeType: 'audio/ogg',
        body: require('stream').Readable.from(fileBuffer),
      },
    });

    console.log(`[Drive] Uploaded audio ${filename}`);
    return response.data.id!;

  } catch (error) {
    console.error('[Drive] Error uploading audio:', error);
    return null;
  }
}

/**
 * Sync today's daily log to Google Drive as text file
 */
export async function syncAllToDrive(): Promise<void> {
  if (!isDriveAvailable()) {
    console.log('[Drive] Drive not available, skipping sync');
    return;
  }

  console.log('[Drive] Syncing daily log to Drive...');

  try {
    // Export today as text
    const texto = await exportarDiaComoTexto();
    const fecha = new Date().toISOString().split('T')[0];
    await syncTextToDrive(`${fecha}.txt`, texto);
    console.log('[Drive] Sync complete');
  } catch (error) {
    console.error('[Drive] Error syncing:', error);
  }
}

/**
 * Upload or update a text file in Google Drive
 */
export async function syncTextToDrive(filename: string, content: string): Promise<string | null> {
  if (!isDriveAvailable()) {
    return null;
  }

  try {
    const buffer = Buffer.from(content, 'utf-8');

    // Check if file already exists
    const existingFile = await findFileByName(filename);

    if (existingFile) {
      // Update existing file
      await drive!.files.update({
        fileId: existingFile.id!,
        media: {
          mimeType: 'text/plain',
          body: require('stream').Readable.from(buffer),
        },
      });
      console.log(`[Drive] Updated ${filename}`);
      return existingFile.id!;

    } else {
      // Create new file
      const response = await drive!.files.create({
        requestBody: {
          name: filename,
          parents: [GOOGLE_DRIVE_FOLDER_ID],
          mimeType: 'text/plain',
        },
        media: {
          mimeType: 'text/plain',
          body: require('stream').Readable.from(buffer),
        },
      });
      console.log(`[Drive] Created ${filename}`);
      return response.data.id!;
    }

  } catch (error) {
    console.error(`[Drive] Error syncing ${filename}:`, error);
    return null;
  }
}

/**
 * Find a file by name in the configured folder
 */
async function findFileByName(filename: string): Promise<drive_v3.Schema$File | null> {
  try {
    const response = await drive!.files.list({
      q: `name='${filename}' and '${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = response.data.files;
    return files && files.length > 0 ? files[0] : null;

  } catch (error) {
    console.error(`[Drive] Error finding file ${filename}:`, error);
    return null;
  }
}

/**
 * Find or create a folder
 */
async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  try {
    // Check if folder exists
    const response = await drive!.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create folder
    const createResponse = await drive!.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
    });

    return createResponse.data.id!;

  } catch (error) {
    console.error(`[Drive] Error with folder ${name}:`, error);
    return parentId; // Fallback to parent
  }
}
