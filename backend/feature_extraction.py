"""
feature_extraction.py — extracts the full audio feature set used across the
app: MFCC, Chroma, Mel Spectrogram, Spectral Contrast, Tonnetz, Zero
Crossing Rate, Spectral Centroid, RMS Energy, Pitch and Tempo.
"""

import base64
import io

import numpy as np
import librosa

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from preprocess import SAMPLE_RATE, downsample_waveform

N_MFCC = 13


def _safe_mean_std(mat):
    return mat.mean(axis=1), mat.std(axis=1)


def _compute_raw_features(y, sr):
    """
    Computes every shared librosa feature exactly once.
    """

    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=N_MFCC,
    )

    chroma = librosa.feature.chroma_cqt(
        y=y,
        sr=sr,
        bins_per_octave=36,
    )

    shared_stft_mag = np.abs(
        librosa.stft(
            y,
            n_fft=2048,
            hop_length=512,
        )
    )

    contrast = librosa.feature.spectral_contrast(
        S=shared_stft_mag,
        sr=sr,
    )

    centroid = librosa.feature.spectral_centroid(
        S=shared_stft_mag,
        sr=sr,
    )

    y_harmonic = librosa.effects.harmonic(y)

    tonnetz = librosa.feature.tonnetz(
        y=y_harmonic,
        sr=sr,
    )

    zcr = librosa.feature.zero_crossing_rate(y)

    rms = librosa.feature.rms(y=y)

    tempo, _ = librosa.beat.beat_track(
        y=y,
        sr=sr,
    )

    tempo = float(np.atleast_1d(tempo)[0])

    return {
        "mfcc": mfcc,
        "chroma": chroma,
        "contrast": contrast,
        "tonnetz": tonnetz,
        "zcr": zcr,
        "centroid": centroid,
        "rms": rms,
        "tempo": tempo,
    }
def extract_feature_vector(y, sr=SAMPLE_RATE, raw=None):
    """
    Returns a fixed-length feature vector for the ML model.
    """

    if raw is None:
        raw = _compute_raw_features(y, sr)

    mfcc_mean, mfcc_std = _safe_mean_std(raw["mfcc"])
    chroma_mean, chroma_std = _safe_mean_std(raw["chroma"])
    contrast_mean, contrast_std = _safe_mean_std(raw["contrast"])
    tonnetz_mean, tonnetz_std = _safe_mean_std(raw["tonnetz"])

    zcr_mean = raw["zcr"].mean()
    zcr_std = raw["zcr"].std()

    centroid_mean = raw["centroid"].mean()
    centroid_std = raw["centroid"].std()

    rms_mean = raw["rms"].mean()
    rms_std = raw["rms"].std()

    tempo = raw["tempo"]

    # Pitch statistics
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
    )

    voiced = f0[~np.isnan(f0)] if f0 is not None else np.array([])

    pitch_mean = float(np.mean(voiced)) if voiced.size else 0.0
    pitch_std = float(np.std(voiced)) if voiced.size else 0.0

    vec = np.concatenate([
        mfcc_mean,
        mfcc_std,

        chroma_mean,
        chroma_std,

        contrast_mean,
        contrast_std,

        tonnetz_mean,
        tonnetz_std,

        [zcr_mean, zcr_std],

        [centroid_mean, centroid_std],

        [rms_mean, rms_std],

        [tempo],

        [pitch_mean, pitch_std],
    ]).astype(np.float32)

    print("\n========== FEATURE VECTOR ==========")
    print("Length:", len(vec))
    print("First 20 values:")
    print(vec[:20])
    print("===================================\n")

    return vec


FEATURE_VECTOR_SIZE = 85


def _fig_to_base64(fig):
    buf = io.BytesIO()

    fig.savefig(
        buf,
        format="png",
        bbox_inches="tight",
        dpi=90,
        facecolor="#12070a",
    )

    plt.close(fig)

    buf.seek(0)

    return base64.b64encode(buf.read()).decode("utf-8")
def extract_feature_vector(y, sr=SAMPLE_RATE, raw=None):
    """
    Returns a fixed-length feature vector for the ML model.
    """

    if raw is None:
        raw = _compute_raw_features(y, sr)

    mfcc_mean, mfcc_std = _safe_mean_std(raw["mfcc"])
    chroma_mean, chroma_std = _safe_mean_std(raw["chroma"])
    contrast_mean, contrast_std = _safe_mean_std(raw["contrast"])
    tonnetz_mean, tonnetz_std = _safe_mean_std(raw["tonnetz"])

    zcr_mean = raw["zcr"].mean()
    zcr_std = raw["zcr"].std()

    centroid_mean = raw["centroid"].mean()
    centroid_std = raw["centroid"].std()

    rms_mean = raw["rms"].mean()
    rms_std = raw["rms"].std()

    tempo = raw["tempo"]

    # Pitch features
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
    )

    voiced = f0[~np.isnan(f0)] if f0 is not None else np.array([])

    pitch_mean = float(np.mean(voiced)) if voiced.size else 0.0
    pitch_std = float(np.std(voiced)) if voiced.size else 0.0

    vec = np.concatenate([
        mfcc_mean,
        mfcc_std,
        chroma_mean,
        chroma_std,
        contrast_mean,
        contrast_std,
        tonnetz_mean,
        tonnetz_std,
        [zcr_mean, zcr_std],
        [centroid_mean, centroid_std],
        [rms_mean, rms_std],
        [tempo],
        [pitch_mean, pitch_std],
    ]).astype(np.float32)

    print("\n========== FEATURE VECTOR ==========")
    print("Length:", len(vec))
    print("First 20 values:")
    print(vec[:20])
    print("===================================\n")

    return vec


FEATURE_VECTOR_SIZE = 85
def _fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(
        buf,
        format="png",
        bbox_inches="tight",
        dpi=90,
        facecolor="#12070a",
    )
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _mel_spectrogram_image(y, sr):
    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=96,
    )

    mel_db = librosa.power_to_db(mel, ref=np.max)

    fig, ax = plt.subplots(figsize=(6, 3))
    fig.patch.set_facecolor("#12070a")
    ax.set_facecolor("#12070a")

    librosa.display.specshow(
        mel_db,
        sr=sr,
        x_axis="time",
        y_axis="mel",
        ax=ax,
        cmap="magma",
    )

    ax.set_axis_off()
    fig.tight_layout(pad=0)

    return _fig_to_base64(fig)
def extract_display_features(y, sr=SAMPLE_RATE, raw=None):
    """
    Returns display features used by the frontend.
    """

    import librosa.display  # noqa: F401

    if raw is None:
        raw = _compute_raw_features(y, sr)

    mfcc = raw["mfcc"]
    chroma = raw["chroma"]
    contrast = raw["contrast"]
    tonnetz = raw["tonnetz"]
    zcr = raw["zcr"]
    centroid = raw["centroid"]
    rms = raw["rms"]
    tempo = raw["tempo"]

    spectrogram_b64 = _mel_spectrogram_image(y, sr)

    return {
        "waveform": downsample_waveform(y, 600),
        "duration_seconds": round(len(y) / sr, 2),
        "mel_spectrogram_png_base64": spectrogram_b64,
        "chroma_matrix": [
            [round(float(v), 3) for v in row]
            for row in chroma[:, ::max(1, chroma.shape[1] // 60)]
        ],
        "mfcc_mean": [
            round(float(v), 3)
            for v in mfcc.mean(axis=1)
        ],
        "spectral_contrast_mean": [
            round(float(v), 3)
            for v in contrast.mean(axis=1)
        ],
        "tonnetz_mean": [
            round(float(v), 3)
            for v in tonnetz.mean(axis=1)
        ],
        "zero_crossing_rate": round(float(zcr.mean()), 5),
        "spectral_centroid_hz": round(float(centroid.mean()), 2),
        "rms_energy": round(float(rms.mean()), 5),
        "tempo_bpm": round(float(tempo), 1),
    }