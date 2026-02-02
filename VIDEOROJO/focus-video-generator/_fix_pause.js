const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/generate_video.py';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find the pause detection block and replace it
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('# Detectar pausas PRIMERO')) {
    startIdx = i;
  }
  if (startIdx >= 0 && i > startIdx && lines[i].includes('# Extraer puntuación final')) {
    endIdx = i;
    break;
  }
}

if (startIdx >= 0 && endIdx >= 0) {
  const newBlock = [
    '        # Detectar pausas al INICIO de la palabra',
    '        while clean.startswith("||"):',
    '            pause_multiplier += 3',
    '            clean = clean[2:]',
    '        while clean.startswith("..."):',
    '            pause_multiplier += 1',
    '            clean = clean[3:]',
    '        while clean.startswith(".."):',
    '            pause_multiplier += 1',
    '            clean = clean[2:]',
    '',
    '        # Detectar pausas al FINAL de la palabra',
    '        if clean.endswith("||"):',
    '            pause_multiplier += 3',
    '            clean = clean[:-2]',
    '        elif clean.endswith("..."):',
    '            pause_multiplier += 1',
    '            clean = clean[:-3]',
    '        elif clean.endswith(".."):',
    '            pause_multiplier += 1',
    '            clean = clean[:-2]',
    '',
  ];
  lines.splice(startIdx, endIdx - startIdx, ...newBlock);
  console.log('Replaced pause detection block');
} else {
  console.log('ERROR: startIdx=' + startIdx + ' endIdx=' + endIdx);
}

// Now fix the "if clean:" check to also emit empty pause entries
// Find "if clean:" followed by "result.append"
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'if clean:' && i + 1 < lines.length && lines[i+1].includes('result.append')) {
    lines[i] = '        if clean or pause_multiplier > 1:';
    // Also change the append to use empty string for pause-only words
    lines[i+1] = '            result.append((clean if clean else "", bold, underline, pause_multiplier))';
    console.log('Fixed empty pause support at line ' + (i+1));
    break;
  }
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done');
