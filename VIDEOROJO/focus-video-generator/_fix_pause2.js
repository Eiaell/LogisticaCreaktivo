const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/generate_video.py';
let lines = fs.readFileSync(p, 'utf8').split('\n');

// Fix preview function: replace "if not clean_word: continue" with blank frame generation
// Line 329 area
let fixed = 0;
for (let i = 0; i < lines.length; i++) {
  // Preview function - has "if not clean_word:" followed by "continue" then "img = create_word_frame"
  if (lines[i].trim() === 'if not clean_word:' &&
      i + 1 < lines.length && lines[i+1].trim() === 'continue' &&
      i + 3 < lines.length && lines[i+3].includes('create_word_frame')) {

    const indent = lines[i].match(/^(\s*)/)[1];

    // Check if this is the preview function (has resize) or the generate function
    let isPreview = false;
    for (let j = i; j < Math.min(i + 15, lines.length); j++) {
      if (lines[j].includes('img.resize')) { isPreview = true; break; }
    }

    if (isPreview) {
      // Preview: empty word = blank frame with pause
      lines[i] = indent + 'if not clean_word:';
      lines[i+1] = [
        indent + '    # Pausa: generar frames en blanco',
        indent + '    if pause_mult > 1:',
        indent + '        blank_pause = Image.new("RGB", (preview_width, preview_height), bg_color)',
        indent + '        w_wpm = word_wpm_map.get(word_i, wpm) if word_wpm_map else wpm',
        indent + '        w_spw = 60.0 / w_wpm',
        indent + '        w_base = max(1, int(fps * w_spw))',
        indent + '        for _ in range(w_base * pause_mult):',
        indent + '            frame_path = temp_dir / f"frame_{frame_num:06d}.png"',
        indent + '            blank_pause.save(frame_path)',
        indent + '            frame_num += 1',
        indent + '    continue',
      ].join('\n');
      fixed++;
      console.log('Fixed preview pause at line ' + (i+1));
    } else {
      // Generate: empty word = blank frame with pause
      lines[i] = indent + 'if not clean_word:';
      lines[i+1] = [
        indent + '    # Pausa: generar frames en blanco',
        indent + '    if pause_mult > 1:',
        indent + '        blank_pause = Image.new("RGB", (width, height), bg_color)',
        indent + '        w_wpm = word_wpm_map.get(i, wpm) if word_wpm_map else wpm',
        indent + '        w_spw = 60.0 / w_wpm',
        indent + '        w_base = max(1, int(fps * w_spw))',
        indent + '        for _ in range(w_base * pause_mult):',
        indent + '            frame_path = temp_dir / f"frame_{frame_num:06d}.png"',
        indent + '            blank_pause.save(frame_path)',
        indent + '            frame_num += 1',
        indent + '    continue',
      ].join('\n');
      fixed++;
      console.log('Fixed generate pause at line ' + (i+1));
    }
  }
}

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('Fixed ' + fixed + ' pause handlers');
