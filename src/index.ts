// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// Main Entry Point
// ============================================

import cron from 'node-cron';
import { validateConfig, FLACO_NUMERO, REMINDER_CRON } from './config/constants';
import { initializeStorage } from './services/storage';
import { getResumenDia } from './services/daily-storage';
import { initializeWhatsApp, sendEndOfDayReminder, client } from './whatsapp/client';
import { initializeDrive, syncAllToDrive, isDriveAvailable } from './services/drive';

const BANNER = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM                   ║
║   ─────────────────────────────────────────                  ║
║   Bot de WhatsApp para Gestión Logística                     ║
║                                                               ║
║   Autor: Flaco Huber                                         ║
║   Versión: 1.0.0                                             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;

async function main() {
  console.log(BANNER);

  // Validate configuration
  const configResult = validateConfig();
  if (!configResult.valid) {
    console.error('\n❌ Missing configuration:');
    configResult.missing.forEach(key => {
      console.error(`   - ${key}`);
    });
    console.error('\nPlease create a .env file with the required keys.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  console.log('✅ Configuration validated\n');

  try {
    // Initialize storage
    console.log('[Init] Initializing local storage...');
    await initializeStorage();
    console.log('[Init] Storage ready\n');

    // Initialize Google Drive (optional)
    console.log('[Init] Checking Google Drive integration...');
    await initializeDrive();
    if (isDriveAvailable()) {
      console.log('[Init] Google Drive connected\n');
    } else {
      console.log('[Init] Google Drive not configured (running in local-only mode)\n');
    }

    // Initialize WhatsApp
    console.log('[Init] Starting WhatsApp client...');
    await initializeWhatsApp();

    // DESHABILITADO: Resumen del día (end-of-day reminder)
    // Para reactivar: descomentar el bloque siguiente
    /*
    if (FLACO_NUMERO) {
      console.log(`[Init] Scheduling end-of-day reminder: ${REMINDER_CRON}`);

      cron.schedule(REMINDER_CRON, async () => {
        console.log('[Cron] Running end-of-day reminder...');

        try {
          const resumen = await getResumenDia();
          await sendEndOfDayReminder(FLACO_NUMERO, resumen);
          console.log('[Cron] Reminder sent successfully');

          // Sync to Drive if available
          if (isDriveAvailable()) {
            await syncAllToDrive();
          }

        } catch (error) {
          console.error('[Cron] Error sending reminder:', error);
        }
      });

      console.log('[Init] Reminder scheduled\n');
    }
    */

    // Set up periodic Drive sync (every 30 minutes)
    if (isDriveAvailable()) {
      cron.schedule('*/30 * * * *', async () => {
        console.log('[Cron] Running Drive sync...');
        await syncAllToDrive();
      });
      console.log('[Init] Drive sync scheduled (every 30 min)\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   Sistema listo. Esperando mensajes de WhatsApp...');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error during initialization:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Received SIGINT, shutting down...');

  try {
    // Sync to Drive before exit
    if (isDriveAvailable()) {
      console.log('[Shutdown] Syncing to Drive...');
      await syncAllToDrive();
    }

    // Close WhatsApp client
    console.log('[Shutdown] Closing WhatsApp client...');
    await client.destroy();

    console.log('[Shutdown] Goodbye!\n');
    process.exit(0);

  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('[Error] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Error] Unhandled rejection:', reason);
});

// Run
main().catch(console.error);
