const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/generate_video.py';
let c = fs.readFileSync(p, 'utf8');

// 1. Add sentences=None to generate_preview_video signature
c = c.replace(
  /def generate_preview_video\(text, output_path, wpm=300, width=1080, height=1920,\s*\n\s*bg_color=\(0, 0, 0\), text_color=\(255, 255, 255\),\s*\n\s*focus_color=\(255, 59, 48\), font_size=120, max_words=20\):/,
  `def generate_preview_video(text, output_path, wpm=300, width=1080, height=1920,
                           bg_color=(0, 0, 0), text_color=(255, 255, 255),
                           focus_color=(255, 59, 48), font_size=120, max_words=20,
                           sentences=None):`
);

// 2. Add word_wpm_map after "return False" in generate_preview_video
c = c.replace(
  /(\s*raw_words = text\.split\(\)\[:max_words\]\s*\n\s*if not raw_words:\s*\n\s*return False\s*\n)\s*\n(\s*fonts = load_fonts\(font_size\)\s*\n\s*\n\s*# Preview más pequeño)/,
  `$1
    # Build per-word WPM map from sentences
    word_wpm_map = {}
    if sentences:
        word_idx = 0
        for sent_info in sentences:
            sent_words = sent_info['text'].split()
            sent_wpm = sent_info.get('wpm', wpm)
            for _ in sent_words:
                word_wpm_map[word_idx] = sent_wpm
                word_idx += 1

    $2`
);

// 3. Replace preview loop to use per-word WPM (use enumerate + word_wpm_map)
c = c.replace(
  /for clean_word, bold, underline, pause_mult in parsed_words:\s*\n\s*if not clean_word:\s*\n\s*continue\s*\n\s*\n\s*img = create_word_frame\(\s*\n\s*clean_word, width, height,\s*\n\s*bg_color, text_color, focus_color, font_size,\s*\n\s*bold, underline, fonts\s*\n\s*\)\s*\n\s*\n\s*# Redimensionar\s*\n\s*img = img\.resize\(\(preview_width, preview_height\), Image\.Resampling\.LANCZOS\)\s*\n\s*\n\s*frames_count = base_frames \* pause_mult/,
  `for word_i, (clean_word, bold, underline, pause_mult) in enumerate(parsed_words):
        if not clean_word:
            continue

        img = create_word_frame(
            clean_word, width, height,
            bg_color, text_color, focus_color, font_size,
            bold, underline, fonts
        )

        # Redimensionar
        img = img.resize((preview_width, preview_height), Image.Resampling.LANCZOS)

        # Per-word WPM from sentence map
        w_wpm = word_wpm_map.get(word_i, wpm) if word_wpm_map else wpm
        w_spw = 60.0 / w_wpm
        w_base = max(1, int(fps * w_spw))
        frames_count = w_base * pause_mult`
);

// 4. Add sentences=None to generate_video signature
c = c.replace(
  /def generate_video\(text, output_path, wpm=300, width=1080, height=1920,\s*\n\s*bg_color=\(0, 0, 0\), text_color=\(255, 255, 255\),\s*\n\s*focus_color=\(255, 59, 48\), font_size=120\):/,
  `def generate_video(text, output_path, wpm=300, width=1080, height=1920,
                   bg_color=(0, 0, 0), text_color=(255, 255, 255),
                   focus_color=(255, 59, 48), font_size=120, sentences=None):`
);

// 5. Add word_wpm_map after "return False" in generate_video
c = c.replace(
  /(\s*raw_words = text\.split\(\)\s*\n\s*if not raw_words:\s*\n\s*print\("Error: No hay palabras", file=sys\.stderr\)\s*\n\s*return False\s*\n)\s*\n(\s*fonts = load_fonts\(font_size\))/,
  `$1
    # Build per-word WPM map from sentences
    word_wpm_map = {}
    if sentences:
        word_idx = 0
        for sent_info in sentences:
            sent_words = sent_info['text'].split()
            sent_wpm = sent_info.get('wpm', wpm)
            for _ in sent_words:
                word_wpm_map[word_idx] = sent_wpm
                word_idx += 1
        print(f"  WPM por oracion: {[s.get('wpm', wpm) for s in sentences]}", file=sys.stderr)

    $2`
);

// 6. Replace generate_video loop to use per-word WPM
c = c.replace(
  /frames_count = base_frames \* pause_mult\s*\n(\s*)for _ in range\(frames_count\):\s*\n\s*frame_path = temp_dir \/ f"frame_\{frame_num:06d\}\.png"\s*\n\s*img\.save\(frame_path\)\s*\n\s*frame_num \+= 1\s*\n\s*\n(\s*blank = Image\.new\('RGB', \(width, height\), bg_color\))/,
  `# Per-word WPM from sentence map
        w_wpm = word_wpm_map.get(i, wpm) if word_wpm_map else wpm
        w_spw = 60.0 / w_wpm
        w_base = max(1, int(fps * w_spw))
        frames_count = w_base * pause_mult
$1for _ in range(frames_count):
            frame_path = temp_dir / f"frame_{frame_num:06d}.png"
            img.save(frame_path)
            frame_num += 1

    $2`
);

// 7. Update main() --json handler to read sentences and pass it
c = c.replace(
  /(\s*focus_color = tuple\(config\.get\("focusColor", \[255, 59, 48\]\)\)\s*\n)\s*\n(\s*success = generate_video\(text, output, wpm, width, height,\s*\n\s*bg, text_color, focus_color, font_size\))/,
  `$1
        sentences = config.get("sentences", None)

        success = generate_video(text, output, wpm, width, height,
                                 bg, text_color, focus_color, font_size, sentences)`
);

// 8. Update main() --preview-video handler to read sentences and pass it
c = c.replace(
  /(\s*focus_color = tuple\(config\.get\("focusColor", \[255, 59, 48\]\)\)\s*\n)\s*\n(\s*success = generate_preview_video\(text, output, wpm, width, height,\s*\n\s*bg, text_color, focus_color, font_size, max_words\))/,
  `$1
        sentences = config.get("sentences", None)

        success = generate_preview_video(text, output, wpm, width, height,
                                         bg, text_color, focus_color, font_size, max_words,
                                         sentences)`
);

fs.writeFileSync(p, c, 'utf8');

// Verify
const final = fs.readFileSync(p, 'utf8');
const checks = [
  ['sentences=None in preview', final.includes('sentences=None):')],
  ['sentences=None in video', final.includes('font_size=120, sentences=None):')],
  ['word_wpm_map count', (final.match(/word_wpm_map/g) || []).length],
  ['w_wpm = word_wpm_map', (final.match(/w_wpm = word_wpm_map/g) || []).length],
  ['sentences = config.get', (final.match(/sentences = config\.get/g) || []).length],
];
checks.forEach(([label, val]) => console.log(`  ${label}: ${val}`));
console.log('DONE');
