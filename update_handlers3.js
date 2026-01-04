const fs = require('fs');

const filePath = 'D:/LOGISTICA/src/whatsapp/handlers.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the response building section to only return JSON
const oldSection = `// Route to appropriate handler
    const response = await routeExtraction(extraction);

    // Build JSON response
    const jsonData = JSON.stringify(extraction.resultado, null, 2);

    // If we got a response, prepend the transcription for audio messages
    if (response && msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
      return \`📝 "\${textToProcess}"

\${response}

📊 JSON:
\${jsonData}\`;
    }

    return response ? \`\${response}

📊 JSON:
\${jsonData}\` : '';`;

const newSection = `// Route to appropriate handler (still needed for storage)
    await routeExtraction(extraction);

    // Return only the JSON
    const jsonData = JSON.stringify(extraction.resultado, null, 2);

    // If it's an audio, include transcription
    if (msg.hasMedia && (msg.type === 'ptt' || msg.type === 'audio')) {
      return \`📝 "\${textToProcess}"

\${jsonData}\`;
    }

    // For text messages, just return JSON (or empty if type is 'otro')
    return extraction.resultado.tipo !== 'otro' ? jsonData : '';`;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: Now returns only JSON');
} else {
  console.log('ERROR: Could not find section');
  // Debug: show what we have around line 69
  const lines = content.split('\n');
  console.log('Lines 68-85:');
  for (let i = 67; i < 85 && i < lines.length; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
