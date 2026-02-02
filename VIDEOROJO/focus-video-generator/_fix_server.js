const fs = require('fs');
let c = fs.readFileSync('D:/LOGISTICA/VIDEOROJO/focus-video-generator/server.js', 'utf8');
let lines = c.split('\n');

// Find lines with "focusColor: config.focusColor" and add sentences after them
let count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('focusColor: config.focusColor')) {
    // Make sure it ends with just the value (no comma yet)
    if (!lines[i].trimEnd().endsWith(',')) {
      lines[i] = lines[i].replace(/(\[255, 59, 48\])/, '$1,');
    }
    // Insert sentences line after it
    lines.splice(i + 1, 0, '        sentences: config.sentences || null');
    count++;
    i++; // skip inserted line
  }
}

fs.writeFileSync('D:/LOGISTICA/VIDEOROJO/focus-video-generator/server.js', lines.join('\n'), 'utf8');
console.log('Added sentences to ' + count + ' pythonConfig objects');
