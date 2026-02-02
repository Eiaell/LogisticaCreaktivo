const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/generate_video.py';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Find the line "    # Dibujar letras" and replace the drawing block
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('# Dibujar letras')) {
    startIdx = i;
  }
  if (startIdx >= 0 && lines[i].includes('# Subrayado: posicionar DEBAJO')) {
    endIdx = i;
    break;
  }
}

if (startIdx >= 0 && endIdx >= 0) {
  const newBlock = [
    '    # Dibujar letras',
    '    stroke_offsets = [(-2,-2),(-2,0),(-2,2),(0,-2),(0,2),(2,-2),(2,0),(2,2)] if bold else []',
    '    current_x = start_x',
    '    for i, (char, char_width) in enumerate(char_positions):',
    '        color = focus_color if i == focus_idx else text_color',
    '        # Bold: dibujar stroke para mayor grosor',
    '        for dx, dy in stroke_offsets:',
    '            draw.text((current_x + dx, y + dy), char, font=actual_font, fill=color)',
    '        draw.text((current_x, y), char, font=actual_font, fill=color)',
    '        current_x += char_width',
    '',
  ];
  lines.splice(startIdx, endIdx - startIdx, ...newBlock);
  console.log('Replaced drawing block (lines ' + (startIdx+1) + '-' + (endIdx+1) + ') with bold stroke effect');
} else {
  console.log('ERROR: Could not find drawing block. startIdx=' + startIdx + ' endIdx=' + endIdx);
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
