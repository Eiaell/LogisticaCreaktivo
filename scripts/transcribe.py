#!/usr/bin/env python
"""
Local Whisper transcription script using faster-whisper with CUDA.
Called from Node.js via child process.

Usage: python transcribe.py <audio_file_path>
Output: Transcribed text to stdout
"""

import sys
import os

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from faster_whisper import WhisperModel

# Load model once (cached after first load)
MODEL = None

def get_model():
    global MODEL
    if MODEL is None:
        # Using CPU since cuDNN is not installed (still fast with medium model)
        MODEL = WhisperModel("medium", device="cpu", compute_type="int8")
    return MODEL

def transcribe(audio_path: str) -> str:
    """Transcribe audio file and return text."""
    model = get_model()

    segments, info = model.transcribe(
        audio_path,
        language="es",
        beam_size=5,
        vad_filter=True,  # Filter out silence
    )

    # Combine all segments
    text = " ".join(segment.text.strip() for segment in segments)
    return text

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python transcribe.py <audio_file_path>", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]

    if not os.path.exists(audio_path):
        print(f"File not found: {audio_path}", file=sys.stderr)
        sys.exit(1)

    try:
        result = transcribe(audio_path)
        print(result)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
