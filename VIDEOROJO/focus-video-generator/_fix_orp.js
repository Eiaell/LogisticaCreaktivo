const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/generate_video.py';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find get_focus_index function and replace it
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('def get_focus_index(word):')) {
    start = i;
    // Find end: next function or blank line followed by def
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].match(/^def /) || lines[j].match(/^class /)) {
        end = j;
        break;
      }
    }
    break;
  }
}

if (start >= 0 && end >= 0) {
  const newFunc = [
    'def get_focus_index(word):',
    '    """Calcula el indice de la letra de enfoque (centro de la palabra)"""',
    '    length = len(word)',
    '    if length <= 1:',
    '        return 0',
    '    if length <= 3:',
    '        return 1',
    '    return length // 2 - 1',
    '',
    '',
  ];
  lines.splice(start, end - start, ...newFunc);
  console.log('Replaced get_focus_index (lines ' + (start+1) + ' to ' + end + ')');
} else {
  console.log('ERROR: start=' + start + ' end=' + end);
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done');
