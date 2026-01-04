const fs = require('fs');

const filePath = 'D:/LOGISTICA/src/whatsapp/handlers.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to find and replace
const regex = /\/\/ Route to appropriate handler\s+const response = await routeExtraction\(extraction\);\s+\/\/ If we got a response, prepend the transcription for audio messages\s+if \(response && msg\.hasMedia && \(msg\.type === 'ptt' \|\| msg\.type === 'audio'\)\) \{\s+return `[^`]+`;\s+\}\s+return response;/;

const newSection = `// Route to appropriate handler
    const response = await routeExtraction(extraction);

    // Build JSON response
    const jsonData = JSON.stringify(extraction.resultado, null, 2);

    // If we got a response, prepend the transcription for audio messages
    if (response && msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
      return \`📝 "\${textToProcess}"\n\n\${response}\n\n📊 JSON:\n\${jsonData}\`;
    }

    return response ? \`\${response}\n\n📊 JSON:\n\${jsonData}\` : '';`;

if (regex.test(content)) {
  content = content.replace(regex, newSection);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: File updated with JSON output');
} else {
  console.log('ERROR: Could not find the section to replace');
}
