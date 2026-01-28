#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Focus Video Generator - Genera videos RSVP con letra de enfoque resaltada
Soporta: bold (*palabra*), subrayado (_palabra_), pausas (palabra... o palabra||)
"""

import os
import sys
import json
import shutil
import subprocess
import re
import base64
from io import BytesIO
from pathlib import Path

# Forzar UTF-8
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont


def get_focus_index(word):
    """Calcula el índice de la letra de enfoque (ORP)"""
    length = len(word)
    if length <= 1:
        return 0
    elif length <= 5:
        return 1
    elif length <= 9:
        return 2
    elif length <= 13:
        return 3
    else:
        return 4


def parse_words_with_ranges(words):
    """
    Parsea una lista de palabras y detecta rangos de bold/underline.
    Soporta: *palabra única* o *múltiples palabras en rango*
    Maneja puntuación: *palabra*, o *palabra*.
    Retorna lista de tuplas: (texto_limpio, bold, underline, pause_mult)
    """
    result = []
    bold_active = False
    underline_active = False

    # Puntuación que puede aparecer después de marcadores de cierre
    punctuation = '.,;:!?)'

    for word in words:
        bold = bold_active
        underline = underline_active
        pause_multiplier = 1
        clean = word
        trailing_punct = ''

        # Detectar pausas PRIMERO
        if clean.endswith('||'):
            pause_multiplier = 4
            clean = clean[:-2]
        elif clean.endswith('...'):
            pause_multiplier = 2
            clean = clean[:-3]
        elif clean.endswith('..'):
            pause_multiplier = 2
            clean = clean[:-2]

        # Extraer puntuación final ANTES de buscar marcadores
        while clean and clean[-1] in punctuation:
            trailing_punct = clean[-1] + trailing_punct
            clean = clean[:-1]

        # Detectar inicio de rango bold *
        starts_bold = clean.startswith('*')

        # Detectar inicio de rango underline _
        starts_underline = clean.startswith('_')

        # Procesar marcadores de apertura
        if starts_bold:
            bold = True
            bold_active = True
            clean = clean[1:]
        if starts_underline:
            underline = True
            underline_active = True
            clean = clean[1:]

        # Detectar cierre de rango (después de quitar apertura)
        ends_bold = clean.endswith('*')
        ends_underline = clean.endswith('_')

        # Procesar marcadores de cierre
        if ends_bold:
            bold = True
            bold_active = False
            clean = clean[:-1]
        if ends_underline:
            underline = True
            underline_active = False
            clean = clean[:-1]

        # Limpiar marcadores extras que pudieran quedar
        clean = clean.strip('*_')

        # Restaurar puntuación
        clean = clean + trailing_punct

        if clean:
            result.append((clean, bold, underline, pause_multiplier))

    return result


def parse_word(word):
    """
    Parsea una palabra individual (para compatibilidad).
    Para rangos, usar parse_words_with_ranges().
    """
    results = parse_words_with_ranges([word])
    if results:
        return results[0]
    return word, False, False, 1


def load_fonts(font_size):
    """Carga fuentes normal y bold"""
    fonts = {'normal': None, 'bold': None}

    normal_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    bold_paths = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]

    for fp in normal_paths:
        if os.path.exists(fp):
            fonts['normal'] = ImageFont.truetype(fp, font_size)
            break

    for fp in bold_paths:
        if os.path.exists(fp):
            fonts['bold'] = ImageFont.truetype(fp, font_size)
            break

    if fonts['normal'] is None:
        fonts['normal'] = ImageFont.load_default()
    if fonts['bold'] is None:
        fonts['bold'] = fonts['normal']

    return fonts


def create_word_frame(word, width=1080, height=1920,
                      bg_color=(0, 0, 0), text_color=(255, 255, 255),
                      focus_color=(255, 59, 48), font_size=120,
                      bold=False, underline=False, fonts=None):
    """Crea un frame con una palabra"""
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    if fonts is None:
        fonts = load_fonts(font_size)

    font = fonts['bold'] if bold else fonts['normal']

    if not word.strip():
        return img

    # Margen mínimo a los lados
    margin = 40

    focus_idx = get_focus_index(word)

    # Calcular posiciones
    char_positions = []
    total_width = 0

    for char in word:
        bbox = font.getbbox(char)
        char_width = bbox[2] - bbox[0]
        char_positions.append((char, char_width))
        total_width += char_width

    if not char_positions:
        return img

    focus_idx = min(focus_idx, len(char_positions) - 1)
    focus_char_width = char_positions[focus_idx][1]
    width_before_focus = sum(cw for _, cw in char_positions[:focus_idx])

    center_x = width // 2
    start_x = center_x - width_before_focus - (focus_char_width // 2)

    # CORRECCIÓN: Asegurar que la palabra no se corte
    # Si empieza antes del margen izquierdo, moverla a la derecha
    if start_x < margin:
        start_x = margin

    # Si termina después del margen derecho, moverla a la izquierda
    end_x = start_x + total_width
    if end_x > width - margin:
        start_x = width - margin - total_width

    # Si aún no cabe (palabra muy larga), centrarla
    if start_x < margin:
        start_x = (width - total_width) // 2

    text_bbox = font.getbbox(word)
    text_height = text_bbox[3] - text_bbox[1]
    y = (height - text_height) // 2

    # Línea guía
    guide_color = (60, 60, 60)
    draw.line([(center_x, 0), (center_x, height)], fill=guide_color, width=2)

    # Dibujar letras
    current_x = start_x
    for i, (char, char_width) in enumerate(char_positions):
        color = focus_color if i == focus_idx else text_color
        draw.text((current_x, y), char, font=font, fill=color)
        current_x += char_width

    # Subrayado
    if underline:
        underline_y = y + text_height + 10
        underline_thickness = max(4, font_size // 20)
        draw.line(
            [(start_x, underline_y), (start_x + total_width, underline_y)],
            fill=focus_color,
            width=underline_thickness
        )

    return img


def generate_preview_video(text, output_path, wpm=300, width=1080, height=1920,
                           bg_color=(0, 0, 0), text_color=(255, 255, 255),
                           focus_color=(255, 59, 48), font_size=120, max_words=20):
    """Genera un video de preview corto (WebM para navegador)"""
    temp_dir = Path(output_path).parent / "temp_preview"
    temp_dir.mkdir(exist_ok=True)

    for f in temp_dir.glob("*.png"):
        f.unlink()

    raw_words = text.split()[:max_words]
    if not raw_words:
        return False

    fonts = load_fonts(font_size)

    # Preview más pequeño
    preview_width = width // 2
    preview_height = height // 2

    seconds_per_word = 60.0 / wpm
    fps = 24
    base_frames = max(1, int(fps * seconds_per_word))

    frame_num = 0

    # Parsear todas las palabras con soporte de rangos
    parsed_words = parse_words_with_ranges(raw_words)

    for clean_word, bold, underline, pause_mult in parsed_words:
        if not clean_word:
            continue

        img = create_word_frame(
            clean_word, width, height,
            bg_color, text_color, focus_color, font_size,
            bold, underline, fonts
        )

        # Redimensionar
        img = img.resize((preview_width, preview_height), Image.Resampling.LANCZOS)

        frames_count = base_frames * pause_mult
        for _ in range(frames_count):
            frame_path = temp_dir / f"frame_{frame_num:06d}.png"
            img.save(frame_path)
            frame_num += 1

    # Frame final
    blank = Image.new('RGB', (preview_width, preview_height), bg_color)
    for _ in range(fps // 2):
        frame_path = temp_dir / f"frame_{frame_num:06d}.png"
        blank.save(frame_path)
        frame_num += 1

    # Crear WebM (mejor soporte en navegadores)
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", str(temp_dir / "frame_%06d.png"),
        "-c:v", "libvpx-vp9",
        "-b:v", "1M",
        "-pix_fmt", "yuv420p",
        output_path
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
        shutil.rmtree(temp_dir)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error FFmpeg: {e.stderr.decode()}", file=sys.stderr)
        # Fallback a MP4
        ffmpeg_cmd_mp4 = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", str(temp_dir / "frame_%06d.png"),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "ultrafast",
            output_path.replace('.webm', '.mp4')
        ]
        try:
            subprocess.run(ffmpeg_cmd_mp4, check=True, capture_output=True)
            shutil.rmtree(temp_dir)
            return True
        except:
            return False


def generate_video(text, output_path, wpm=300, width=1080, height=1920,
                   bg_color=(0, 0, 0), text_color=(255, 255, 255),
                   focus_color=(255, 59, 48), font_size=120):
    """Genera un video RSVP completo"""
    temp_dir = Path(output_path).parent / "temp_frames"
    temp_dir.mkdir(exist_ok=True)

    for f in temp_dir.glob("*.png"):
        f.unlink()

    raw_words = text.split()
    if not raw_words:
        print("Error: No hay palabras", file=sys.stderr)
        return False

    fonts = load_fonts(font_size)
    print(f"Generando {len(raw_words)} palabras...", file=sys.stderr)

    seconds_per_word = 60.0 / wpm
    fps = 30
    base_frames = max(1, int(fps * seconds_per_word))

    frame_num = 0

    # Parsear todas las palabras con soporte de rangos
    parsed_words = parse_words_with_ranges(raw_words)

    for i, (clean_word, bold, underline, pause_mult) in enumerate(parsed_words):
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(parsed_words)}...", file=sys.stderr)

        if not clean_word:
            continue

        img = create_word_frame(
            clean_word, width, height,
            bg_color, text_color, focus_color, font_size,
            bold, underline, fonts
        )

        frames_count = base_frames * pause_mult
        for _ in range(frames_count):
            frame_path = temp_dir / f"frame_{frame_num:06d}.png"
            img.save(frame_path)
            frame_num += 1

    blank = Image.new('RGB', (width, height), bg_color)
    for _ in range(fps):
        frame_path = temp_dir / f"frame_{frame_num:06d}.png"
        blank.save(frame_path)
        frame_num += 1

    print(f"Creando video...", file=sys.stderr)

    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", str(temp_dir / "frame_%06d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "23",
        output_path
    ]

    try:
        subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
        print(f"Listo: {output_path}", file=sys.stderr)
        shutil.rmtree(temp_dir)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr.decode()}", file=sys.stderr)
        return False


def main():
    if len(sys.argv) < 2:
        print("Uso: python generate_video.py --json | --preview-video | <archivo.txt>")
        sys.exit(1)

    if sys.argv[1] == "--json":
        input_data = sys.stdin.buffer.read().decode('utf-8')
        config = json.loads(input_data)

        text = config.get("text", "")
        wpm = config.get("wpm", 300)
        output = config.get("output", "output.mp4")
        width = config.get("width", 1080)
        height = config.get("height", 1920)
        font_size = config.get("fontSize", 120)

        bg = tuple(config.get("bgColor", [0, 0, 0]))
        text_color = tuple(config.get("textColor", [255, 255, 255]))
        focus_color = tuple(config.get("focusColor", [255, 59, 48]))

        success = generate_video(text, output, wpm, width, height,
                                 bg, text_color, focus_color, font_size)

        print(json.dumps({"success": success, "output": output if success else None}))

    elif sys.argv[1] == "--preview-video":
        input_data = sys.stdin.buffer.read().decode('utf-8')
        config = json.loads(input_data)

        text = config.get("text", "")
        wpm = config.get("wpm", 300)
        output = config.get("output", "preview.webm")
        width = config.get("width", 1080)
        height = config.get("height", 1920)
        font_size = config.get("fontSize", 120)
        max_words = config.get("maxWords", 20)

        bg = tuple(config.get("bgColor", [0, 0, 0]))
        text_color = tuple(config.get("textColor", [255, 255, 255]))
        focus_color = tuple(config.get("focusColor", [255, 59, 48]))

        success = generate_preview_video(text, output, wpm, width, height,
                                         bg, text_color, focus_color, font_size, max_words)

        print(json.dumps({"success": success, "output": output if success else None}))

    else:
        text_file = sys.argv[1]
        wpm = int(sys.argv[2]) if len(sys.argv) > 2 else 300
        output = sys.argv[3] if len(sys.argv) > 3 else "focus_video.mp4"

        with open(text_file, 'r', encoding='utf-8') as f:
            text = f.read()

        generate_video(text, output, wpm)


if __name__ == "__main__":
    main()
