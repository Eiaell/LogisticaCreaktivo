const fs = require('fs');

const filePath = 'D:/LOGISTICA/src/whatsapp/client.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldSection = `// Message event (message_create captures both sent and received messages)
client.on('message_create', async (msg: Message) => {
  try {
    // Skip messages sent by the bot itself (prevent loops!)
    if (msg.fromMe && msg.body && !msg.hasMedia) {
      // Only process our own messages if they are audio/ptt
      return;
    }

    // Only process our own messages (fromMe = true means WE sent it)
    if (!msg.fromMe) {
      return;
    }

    // Log message info
    console.log(\`[WhatsApp] Message: \${msg.type}\`);

    // Skip status updates
    if (msg.from === 'status@broadcast') {
      return;
    }

    // Process the message
    const response = await handleMessage(msg);`;

const newSection = `// Message event (message_create captures both sent and received messages)
client.on('message_create', async (msg: Message) => {
  try {
    // Skip messages sent by the bot itself (prevent loops!)
    if (msg.fromMe && msg.body && !msg.hasMedia) {
      // Only process our own messages if they are audio/ptt
      return;
    }

    // Only process our own messages (fromMe = true means WE sent it)
    if (!msg.fromMe) {
      return;
    }

    // Skip status updates
    if (msg.from === 'status@broadcast') {
      return;
    }

    // Get chat info to check if it's allowed
    const chat = await msg.getChat();
    const chatName = chat.name || '';
    const isGroup = chat.isGroup;

    // Only allow: personal chat (sending to yourself) OR group named "Logibot prueba"
    const isSelfChat = msg.to === msg.from; // Sending message to yourself
    const isLogibotGroup = isGroup && chatName.toLowerCase().includes('logibot');

    if (!isSelfChat && !isLogibotGroup) {
      // Silently ignore messages to other chats
      return;
    }

    // Log message info
    console.log(\`[WhatsApp] Message: \${msg.type} in \${isGroup ? 'group' : 'private'}: \${chatName || 'self'}\`);

    // Process the message
    const response = await handleMessage(msg);`;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: client.ts updated');
} else {
  console.log('ERROR: Could not find section to replace');
}
