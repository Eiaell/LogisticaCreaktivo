const fs = require('fs');

const filePath = 'D:/LOGISTICA/src/whatsapp/handlers.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the "Envía un audio o texto" message - just return empty string instead
const oldLine = `    } else {
      return 'Envía un audio o texto para continuar.';
    }`;
const newLine = `    } else {
      // Silently ignore non-audio, non-text messages (images, stickers, etc.)
      return '';
    }`;

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Removed annoying message');
} else {
  console.log('ERROR: Could not find the line to replace');
}
