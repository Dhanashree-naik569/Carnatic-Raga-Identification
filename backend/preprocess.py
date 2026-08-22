"""
preprocess.py — audio loading, trimming and normalization utilities shared
by feature_extraction.py, train.py and predict.py.
"""

import io
import os
import tempfile
import subprocess

import numpy as np
import librosa

SAMPLE_RATE = 22050
TOP_DB = 30


def load_audio(source, sr=SAMPLE_RATE, duration=None):
    if isinstance(source, (bytes, bytearray)):
        try:
            # Try loading directly (WAV, FLAC, etc.)
            y, _ = librosa.load(
                io.BytesIO(source),
                sr=sr,
                mono=True,
                duration=duration,
            )
            return y, sr

        except Exception:
            # Convert WebM/Opus to WAV using FFmpeg
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as in_file:
                in_file.write(source)
                in_path = in_file.name

            out_path = in_path.replace(".webm", ".wav")

            try:
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        in_path,
                        "-ac",
                        "1",
                        "-ar",
                        str(sr),
                        out_path,
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                )

                y, _ = librosa.load(
                    out_path,
                    sr=sr,
                    mono=True,
                    duration=duration,
                )
                return y, sr

            finally:
                if os.path.exists(in_path):
                    os.remove(in_path)

                if os.path.exists(out_path):
                    os.remove(out_path)

    else:
        y, _ = librosa.load(
            source,
            sr=sr,
            mono=True,
            duration=duration,
        )
        return y, sr


def trim_silence(y, top_db=TOP_DB):
    trimmed, _ = librosa.effects.trim(y, top_db=top_db)

    if trimmed.size == 0:
        return y

    return trimmed


def normalize(y):
    peak = np.max(np.abs(y)) if y.size else 0

    if peak > 0:
        y = y / peak

    return y


def preprocess_audio(source, sr=SAMPLE_RATE, duration=None):
    """Full pipeline: load -> trim -> normalize. Returns (y, sr)."""

    y, sr = load_audio(source, sr=sr, duration=duration)

    print("\n========== BEFORE TRIM ==========")
    print("Samples:", len(y))
    print("Duration:", len(y) / sr)
    print("Max amplitude:", np.max(np.abs(y)))
    print("Mean amplitude:", np.mean(np.abs(y)))

    y = trim_silence(y)

    print("\n========== AFTER TRIM ==========")
    print("Samples:", len(y))
    print("Duration:", len(y) / sr)
    print("Max amplitude:", np.max(np.abs(y)))
    print("Mean amplitude:", np.mean(np.abs(y)))

    y = normalize(y)

    print("\n========== AFTER NORMALIZE ==========")
    print("Max amplitude:", np.max(np.abs(y)))
    print("Mean amplitude:", np.mean(np.abs(y)))
    print("====================================\n")

    if y.size == 0:
        raise ValueError("Audio is empty/silent after preprocessing.")

    return y, sr


def downsample_waveform(y, target_points=600):
    """
    Return a small array of amplitude points for plotting
    the waveform in the browser.
    """

    if len(y) <= target_points:
        return y.tolist()

    step = len(y) // target_points
    return y[::step][:target_points].tolist()