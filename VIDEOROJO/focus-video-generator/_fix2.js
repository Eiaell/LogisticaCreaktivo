const fs = require('fs');
const p = 'D:/LOGISTICA/VIDEOROJO/focus-video-generator/generate_video.py';
let c = fs.readFileSync(p, 'utf8');

// ============================================================
// 1. Fix generate_preview_video: add sentences param + use it
// ============================================================

// Add sentences parameter
c = c.replace(
  'def generate_preview_video(text, output_path, wpm=300, width=1080, height=1920,\n                           bg_color=(0, 0, 0), text_color=(255, 255, 255),\n                           focus_color=(255, 59, 48), font_size=120, max_words=20):',
  'def generate_preview_video(text, output_path, wpm=300, width=1080, height=1920,\n                           bg_color=(0, 0, 0), text_color=(255, 255, 255),\n                           focus_color=(255, 59, 48), font_size=120, max_words=20,\n                           sentences=None):'
);

// After "raw_words = text.split()[:max_words]" + "if not raw_words" + "return False", add word_wpm_map
c = c.replace(
  '    raw_words = text.split()[:max_words]\n    if not raw_words:\n        return False\n\n    fonts = load_fonts(font_size)',
  `    raw_words = text.split()[:max_words]
    if not raw_words:
        return False

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

    fonts = load_fonts(font_size)`
);

// Replace the loop in generate_preview_video to use per-word WPM
c = c.replace(
  '    for clean_word, bold, underline, pause_mult in parsed_words:\n        if not clean_word:\n            continue\n\n        img = create_word_frame(\n            clean_word, width, height,\n            bg_color, text_color, focus_color, font_size,\n            bold, underline, fonts\n        )\n\n        # Redimensionar\n        img = img.resize((preview_width, preview_height), Image.Resampling.LANCZOS)\n\n        frames_count = base_frames * pause_mult',
  `    for word_i, (clean_word, bold, underline, pause_mult) in enumerate(parsed_words):
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

// ============================================================
// 2. Fix generate_video: add sentences param + use it
// ============================================================

// Add sentences parameter
c = c.replace(
  'def generate_video(text, output_path, wpm=300, width=1080, height=1920,\n                   bg_color=(0, 0, 0), text_color=(255, 255, 255),\n                   focus_color=(255, 59, 48), font_size=120):',
  'def generate_video(text, output_path, wpm=300, width=1080, height=1920,\n                   bg_color=(0, 0, 0), text_color=(255, 255, 255),\n                   focus_color=(255, 59, 48), font_size=120, sentences=None):'
);

// After "raw_words = text.split()" block, add word_wpm_map
c = c.replace(
  '    raw_words = text.split()\n    if not raw_words:\n        print("Error: No hay palabras", file=sys.stderr)\n        return False\n\n    fonts = load_fonts(font_size)',
  `    raw_words = text.split()
    if not raw_words:
        print("Error: No hay palabras", file=sys.stderr)
        return False

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

    fonts = load_fonts(font_size)`
);

// Replace the loop in generate_video to use per-word WPM
c = c.replace(
  '        frames_count = base_frames * pause_mult\n        for _ in range(frames_count):\n            frame_path = temp_dir / f"frame_{frame_num:06d}.png"\n            img.save(frame_path)\n            frame_num += 1\n\n    blank = Image.new(\'RGB\', (width, height), bg_color)',
  `        # Per-word WPM from sentence map
        w_wpm = word_wpm_map.get(i, wpm) if word_wpm_map else wpm
        w_spw = 60.0 / w_wpm
        w_base = max(1, int(fps * w_spw))
        frames_count = w_base * pause_mult
        for _ in range(frames_count):
            frame_path = temp_dir / f"frame_{frame_num:06d}.png"
            img.save(frame_path)
            frame_num += 1

    blank = Image.new('RGB', (width, height), bg_color)`
);

// ============================================================
// 3. Fix main() to read sentences and pass to functions
// ============================================================

// For --json handler
c = c.replace(
  '        success = generate_video(text, output, wpm, width, height,\n                                 bg, text_color, focus_color, font_size)',
  `        sentences = config.get("sentences", None)

        success = generate_video(text, output, wpm, width, height,
                                 bg, text_color, focus_color, font_size, sentences)`
);

// For --preview-video handler
c = c.replace(
  '        success = generate_preview_video(text, output, wpm, width, height,\n                                         bg, text_color, focus_color, font_size, max_words)',
  `        sentences = config.get("sentences", None)

        success = generate_preview_video(text, output, wpm, width, height,
                                         bg, text_color, focus_color, font_size, max_words,
                                         sentences)`
);

fs.writeFileSync(p, c, 'utf8');
console.log('OK - Python fully updated with sentences support');

// Verify
const final = fs.readFileSync(p, 'utf8');
console.log('Has "sentences=None" in generate_video:', final.includes('font_size=120, sentences=None):'));
console.log('Has "sentences=None" in generate_preview_video:', final.includes('max_words=20,\n                           sentences=None)'));
console.log('Has "word_wpm_map" count:', (final.match(/word_wpm_map/g) || []).length);
console.log('Has "w_wpm = word_wpm_map":', (final.match(/w_wpm = word_wpm_map/g) || []).length);
console.log('Has "sentences = config.get":', (final.match(/sentences = config\.get/g) || []).length);
