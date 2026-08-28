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

# Audio-energy threshold.
SILENCE_RMS_THRESHOLD = 0.008

# Minimum usable recording duration.
MIN_AUDIO_SECONDS = 0.5

# Minimum amount of detected pitched/voiced content.
MIN_VOICED_RATIO = 0.45
MIN_VOICED_FRAMES = 10


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
            # Convert WebM/Opus to WAV using FFmpeg.
            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=".webm",
            ) as in_file:

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
    trimmed, _ = librosa.effects.trim(
        y,
        top_db=top_db,
    )

    if trimmed.size == 0:
        return y

    return trimmed


def normalize(y):
    peak = np.max(np.abs(y)) if y.size else 0

    if peak > 0:
        y = y / peak

    return y

def validate_audio(y, sr):
    """
    Reject recordings that are empty, too quiet, too short,
    or do not contain sufficiently stable melodic/pitched content.
    """

    if y is None or y.size == 0:
        raise ValueError(
            "No audio was detected. Please record yourself singing "
            "a Carnatic phrase."
        )

    duration_seconds = len(y) / sr

    print("\n========== AUDIO VALIDATION ==========")
    print("Duration:", round(duration_seconds, 2), "seconds")

    # ---------------------------------------------------------
    # 1. Minimum duration
    # ---------------------------------------------------------

    if duration_seconds < MIN_AUDIO_SECONDS:
        print("Result: TOO SHORT")
        print("======================================\n")

        raise ValueError(
            "Recording is too short. Please sing for at least "
            f"{MIN_AUDIO_SECONDS:.1f} seconds."
        )

    # ---------------------------------------------------------
    # 2. Energy check
    # ---------------------------------------------------------

    rms = float(
        np.sqrt(
            np.mean(
                np.square(y)
            )
        )
    )

    print("RMS energy:", rms)

    if rms < SILENCE_RMS_THRESHOLD:
        print("Result: SILENCE / TOO QUIET")
        print("======================================\n")

        raise ValueError(
            "No singing detected. Please sing a Carnatic phrase "
            "and try again."
        )

    # ---------------------------------------------------------
    # 3. Pitch detection
    # ---------------------------------------------------------

    try:
        f0, voiced_flag, voiced_prob = librosa.pyin(
            y,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
            sr=sr,
            frame_length=2048,
            hop_length=512,
        )

        if f0 is None:
            raise ValueError(
                "No singing detected. Please sing a Carnatic phrase "
                "and try again."
            )

        valid_pitch = np.isfinite(f0)

        voiced_count = int(
            np.sum(valid_pitch)
        )

        total_frames = len(f0)

        voiced_ratio = (
            voiced_count / total_frames
            if total_frames > 0
            else 0.0
        )

        print("Voiced frames:", voiced_count)
        print("Total frames:", total_frames)
        print(
            "Voiced ratio:",
            round(voiced_ratio, 4),
        )

        # -----------------------------------------------------
        # 4. Basic voiced-content check
        # -----------------------------------------------------

        if (
            voiced_count < MIN_VOICED_FRAMES
            or voiced_ratio < MIN_VOICED_RATIO
        ):
            print(
                "Result: NO SUFFICIENT MELODIC CONTENT"
            )

            print(
                "======================================\n"
            )

            raise ValueError(
                "No singing detected. Please sing a Carnatic phrase "
                "with a clear melody and try again."
            )

        # -----------------------------------------------------
        # 5. Pitch stability check
        # -----------------------------------------------------

        pitch_values = f0[valid_pitch]

        if len(pitch_values) < 10:
            raise ValueError(
                "No stable singing detected. Please sing a clear "
                "Carnatic phrase and try again."
            )

        # Convert frequency to MIDI/pitch scale.
        # This makes pitch variation easier to measure.
        midi_values = librosa.hz_to_midi(pitch_values)

        # Remove invalid values just in case.
        midi_values = midi_values[
            np.isfinite(midi_values)
        ]

        if len(midi_values) < 10:
            raise ValueError(
                "Could not detect a stable melodic voice. "
                "Please sing a Carnatic phrase and try again."
            )

        # Calculate frame-to-frame pitch movement.
        pitch_changes = np.abs(
            np.diff(midi_values)
        )

        # Ignore extremely large jumps caused by unreliable
        # pitch detections.
        reasonable_changes = pitch_changes[
            pitch_changes < 2.0
        ]

        stable_ratio = (
            len(reasonable_changes) / len(pitch_changes)
            if len(pitch_changes) > 0
            else 0.0
        )

        print(
            "Stable pitch ratio:",
            round(stable_ratio, 4),
        )

        # A genuine sung phrase should contain a reasonable
        # amount of continuous/stable pitch information.
        MIN_STABLE_PITCH_RATIO = 0.55

        if stable_ratio < MIN_STABLE_PITCH_RATIO:
            print(
                "Result: UNSTABLE / NON-MELODIC AUDIO"
            )

            print(
                "======================================\n"
            )

            raise ValueError(
                "No clear singing melody detected. "
                "Please sing a Carnatic phrase and try again."
            )

        # -----------------------------------------------------
        # 6. Median pitch information
        # -----------------------------------------------------

        median_pitch = float(
            np.median(midi_values)
        )

        pitch_std = float(
            np.std(midi_values)
        )

        print(
            "Median pitch:",
            round(median_pitch, 2),
        )

        print(
            "Pitch variation:",
            round(pitch_std, 2),
            "semitones",
        )

        # Completely chaotic pitch detection is usually noise.
        if pitch_std > 18:
            print(
                "Result: EXCESSIVE PITCH VARIATION"
            )

            print(
                "======================================\n"
            )

            raise ValueError(
                "The recording does not contain a clear singing "
                "melody. Please sing a Carnatic phrase and try again."
            )

    except ValueError:
        raise

    except Exception as e:
        print(
            "Pitch detection error:",
            e,
        )

        raise ValueError(
            "Could not detect a clear melodic voice. "
            "Please sing a Carnatic phrase and try again."
        )

    print(
        "Result: SUFFICIENT MELODIC CONTENT DETECTED"
    )

    print(
        "======================================\n"
    )


def preprocess_audio(
    source,
    sr=SAMPLE_RATE,
    duration=None,
):
    """
    Full pipeline:

        load
        ↓
        validate raw audio
        ↓
        trim silence
        ↓
        validate remaining audio
        ↓
        normalize

    Returns (y, sr).
    """

    y, sr = load_audio(
        source,
        sr=sr,
        duration=duration,
    )

    print("\n========== BEFORE TRIM ==========")
    print("Samples:", len(y))
    print("Duration:", len(y) / sr)

    if y.size:
        print(
            "Max amplitude:",
            np.max(np.abs(y)),
        )

        print(
            "Mean amplitude:",
            np.mean(np.abs(y)),
        )

    else:
        print("Max amplitude: 0")
        print("Mean amplitude: 0")

    # Reject silence/noise before trimming.
    validate_audio(y, sr)

    y = trim_silence(y)

    print("\n========== AFTER TRIM ==========")
    print("Samples:", len(y))
    print("Duration:", len(y) / sr)

    if y.size:
        print(
            "Max amplitude:",
            np.max(np.abs(y)),
        )

        print(
            "Mean amplitude:",
            np.mean(np.abs(y)),
        )

    # Validate again after trimming.
    validate_audio(y, sr)

    y = normalize(y)

    print("\n========== AFTER NORMALIZE ==========")

    if y.size:
        print(
            "Max amplitude:",
            np.max(np.abs(y)),
        )

        print(
            "Mean amplitude:",
            np.mean(np.abs(y)),
        )

    print("====================================\n")

    if y.size == 0:
        raise ValueError(
            "Audio is empty/silent after preprocessing."
        )

    return y, sr


def downsample_waveform(
    y,
    target_points=600,
):
    """
    Return a small array of amplitude points
    for plotting the waveform in the browser.
    """

    if len(y) <= target_points:
        return y.tolist()

    step = len(y) // target_points

    return y[::step][:target_points].tolist()