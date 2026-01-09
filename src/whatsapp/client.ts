// ============================================
// CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
// WhatsApp Client Setup
// ============================================

import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { FLACO_NUMERO, BOT_NAME } from '../config/constants';
import { handleMessage } from './handlers';

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth',
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
});

// QR Code event
client.on('qr', (qr: string) => {
  console.log('\n[WhatsApp] Scan this QR code to authenticate:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n');
});

// Authentication success
client.on('authenticated', () => {
  console.log('[WhatsApp] Authentication successful!');
});

// Authentication failure
client.on('auth_failure', (msg: string) => {
  console.error('[WhatsApp] Authentication failed:', msg);
});

// Ready event
client.on('ready', () => {
  console.log(`[WhatsApp] ${BOT_NAME} is ready!`);
  console.log(`[WhatsApp] Listening for messages from: ${FLACO_NUMERO || 'all numbers (no filter set)'}`);
});

// Message event (message_create captures both sent and received messages)
// Message event (message_create captures both sent and received messages)
client.on('message_create', async (msg: Message) => {
  try {
    // Only process messages sent by the user (fromMe = true)
    if (!msg.fromMe) {
      return;
    }

    // Skip bot's own replies (prevent infinite loops!)
    // Bot replies contain 📝, {"tipo", or are replies to messages
    if (msg.body && (msg.body.includes('📝') || msg.body.includes('{"tipo"') || msg.hasQuotedMsg)) {
      return;
    }

    // Skip status updates
    if (msg.from === 'status@broadcast') {
      return;
    }

    // Get chat info to check if it's allowed
    const chat = await msg.getChat();
    // const chatName = chat.name || ''; // Removed unused var
    const isGroup = chat.isGroup;

    // Only allow: personal chat (sending to yourself) OR group named "Logibot prueba"
    const isSelfChat = msg.to === msg.from; // Sending message to yourself
    // const isLogibotGroup = isGroup && chatName.toLowerCase().includes('logibot'); // Removed hardcoded check per plan

    // For now, we are strict: ONLY Self Chat is allowed for the bot to read unless configured otherwise
    if (!isSelfChat) {
      // Silently ignore messages to other chats
      return;
    }

    // Process the message
    const response = await handleMessage(msg);

    // Only send response if there's something meaningful to report
    if (response) {
      await msg.reply(response);
    }

  } catch (error) {
    console.error('[WhatsApp] Error handling message:', error);
  }
});

// Disconnection event
client.on('disconnected', (reason: string) => {
  console.log('[WhatsApp] Client disconnected:', reason);
});

// Error handling
client.on('error', (error: Error) => {
  console.error('[WhatsApp] Client error:', error);
});

/**
 * Initialize the WhatsApp client
 */
export async function initializeWhatsApp(): Promise<Client> {
  console.log('[WhatsApp] Initializing client...');
  await client.initialize();
  return client;
}

/**
 * Send a message to a specific number
 * @param number - Phone number with country code (e.g., "51987654321")
 * @param message - Message to send
 */
export async function sendMessage(number: string, message: string): Promise<void> {
  const chatId = `${number.replace(/\D/g, '')}@c.us`;
  await client.sendMessage(chatId, message);
}

/**
 * Send end-of-day reminder
 */
export async function sendEndOfDayReminder(number: string, summary: {
  acuerdos: number;
  movimientos: number;
  gastos: number;
  totalGastos: number;
}): Promise<void> {
  let mensaje = '🕐 Resumen del día - ¿Me faltó algo?\n\n';
  mensaje += 'Registré hoy:\n';
  mensaje += `• ${summary.acuerdos} acuerdos con proveedores\n`;
  mensaje += `• ${summary.movimientos} movimientos de movilidad\n`;
  mensaje += `• ${summary.gastos} gastos extraordinarios`;

  if (summary.totalGastos > 0) {
    mensaje += ` (S/. ${summary.totalGastos.toFixed(2)})`;
  }

  mensaje += '\n\n¿Hubo algo más que no capturé? Cuéntame en un audio.';

  await sendMessage(number, mensaje);
}

export { client };
