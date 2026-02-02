const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/generate_video.py';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// 1. Remove the guide line (3 lines: comment + guide_color + draw.line)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('# Línea guía vertical')) {
    lines.splice(i, 3); // remove comment, guide_color, draw.line
    console.log('Removed guide line at line ' + (i+1));
    break;
  }
}

// 2. Fix the centering logic: the focus letter MUST be at center_x,
//    even if it means the word gets clipped. The current code has fallbacks
//    that push start_x away from the ideal position.
//    Find the block from "focus_idx = min(" to "start_x = (width - total_width) // 2"
let blockStart = -1;
let blockEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('focus_idx = min(focus_idx')) {
    blockStart = i;
  }
  if (blockStart >= 0 && lines[i].includes('start_x = (width - total_width) // 2')) {
    blockEnd = i;
    break;
  }
}

if (blockStart >= 0 && blockEnd >= 0) {
  // Replace with simpler logic: always center focus letter, clamp to margins only if needed
  const newBlock = [
    '    focus_idx = min(focus_idx, len(char_positions) - 1)',
    '    focus_char_width = char_positions[focus_idx][1]',
    '    width_before_focus = sum(cw for _, cw in char_positions[:focus_idx])',
    '',
    '    center_x = width // 2',
    '    # Centrar la letra de enfoque en el medio exacto de la pantalla',
    '    start_x = center_x - width_before_focus - (focus_char_width // 2)',
    '',
    '    # Solo ajustar si la palabra se sale completamente de la pantalla',
    '    end_x = start_x + total_width',
    '    if end_x > width:',
    '        start_x = width - total_width',
    '    if start_x < 0:',
    '        start_x = 0',
  ];
  lines.splice(blockStart, blockEnd - blockStart + 1, ...newBlock);
  console.log('Replaced centering logic (lines ' + (blockStart+1) + '-' + (blockEnd+1) + ')');
} else {
  console.log('ERROR: blockStart=' + blockStart + ' blockEnd=' + blockEnd);
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Done');
