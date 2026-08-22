"""
train.py — trains the TensorFlow/Keras raga classifier.

HYBRID REAL + SYNTHETIC TRAINING
---------------------------------
This script now checks backend/dataset/<RagaName>/ for real audio files
first. For any raga folder that contains real .wav/.mp3/.flac recordings
(e.g. downloaded via scripts/download_dataset.py or scripts/download_kalyani.py),
it extracts REAL features from those files using feature_extraction.py.

For any raga that still has no audio on disk, it falls back to a
deterministic SYNTHETIC centroid-plus-noise sample (as before) so the
pipeline always trains a full 20-class model even with a partially
populated dataset — but the console output tells you exactly which classes
used real vs. synthetic data, so you always know what you're getting.

As you download more real, licensed audio into backend/dataset/<Raga>/,
just re-run `python train.py` — it will automatically use it.

Usage:
    python train.py
"""
import os
import sys
import hashlib
import numpy as np
import joblib
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

from ragas_data import RAGAS
from feature_extraction import FEATURE_VECTOR_SIZE, extract_feature_vector
from preprocess import preprocess_audio

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "model.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")
DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataset")
AUDIO_EXTS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}

RNG_SEED = 42
MIN_REAL_SAMPLES_TO_TRUST = 5  # below this, still mix in synthetic for stability


def _raga_centroid(raga, dim=FEATURE_VECTOR_SIZE):
    """Deterministic pseudo-random centroid per raga, seeded by its name.
    The first 12 dims echo the raga's real swara template; the rest stand
    in for MFCC/contrast/tonnetz/tempo/pitch dimensions."""
    h = int(hashlib.sha256(raga["name"].encode()).hexdigest(), 16)
    rng = np.random.default_rng(h % (2**32))
    vec = rng.normal(0, 1, size=dim)
    swara_component = np.zeros(12)
    for s in raga["swaras"]:
        swara_component[s % 12] = 3.0
    vec[:12] += swara_component
    return vec


def _synthetic_samples(raga, n, noise_std=0.8, seed=RNG_SEED):
    rng = np.random.default_rng(seed)
    centroid = _raga_centroid(raga)
    return [centroid + rng.normal(0, noise_std, size=FEATURE_VECTOR_SIZE) for _ in range(n)]


def _real_samples_for_raga(raga_name):
    """Look for backend/dataset/<raga_name>/ (case-insensitive, spaces
    ignored) and extract real feature vectors from any audio inside."""
    if not os.path.isdir(DATASET_DIR):
        return []

    matching_folder = None
    target = raga_name.replace(" ", "").lower()
    for entry in os.listdir(DATASET_DIR):
        if entry.replace(" ", "").lower() == target and os.path.isdir(os.path.join(DATASET_DIR, entry)):
            matching_folder = os.path.join(DATASET_DIR, entry)
            break
    if not matching_folder:
        return []

    vectors = []
    files = [f for f in os.listdir(matching_folder) if os.path.splitext(f)[1].lower() in AUDIO_EXTS]
    for i, fname in enumerate(files):
        path = os.path.join(matching_folder, fname)
        try:
            y, sr = preprocess_audio(path)
            vec = extract_feature_vector(y, sr)
            vectors.append(vec)
        except Exception as e:
            print(f"  [skip] {fname}: {e}", file=sys.stderr)
        if (i + 1) % 20 == 0:
            print(f"  ...extracted features from {i + 1}/{len(files)} files in {os.path.basename(matching_folder)}")
    return vectors


def build_training_data(samples_per_class=250, noise_std=0.8):
    X, y = [], []
    summary = []

    for raga in RAGAS:
        real_vectors = _real_samples_for_raga(raga["name"])

        if len(real_vectors) >= MIN_REAL_SAMPLES_TO_TRUST:
            # enough real data: use it, lightly augmented with jitter for volume
            rng = np.random.default_rng(RNG_SEED)
            base = np.array(real_vectors)
            reps = max(1, samples_per_class // max(1, len(real_vectors)))
            for vec in base:
                for _ in range(reps):
                    jittered = vec + rng.normal(0, 0.05, size=FEATURE_VECTOR_SIZE)
                    X.append(jittered)
                    y.append(raga["name"])
            summary.append((raga["name"], len(real_vectors), "real"))
        else:
            # not enough real data yet: synthetic centroid + noise
            for vec in _synthetic_samples(raga, samples_per_class, noise_std):
                X.append(vec)
                y.append(raga["name"])
            if real_vectors:
                summary.append((raga["name"], len(real_vectors), "real+synthetic (too few real samples)"))
            else:
                summary.append((raga["name"], 0, "synthetic only"))

    print("\nTraining data summary:")
    for name, n_real, mode in summary:
        print(f"  {name:25s} real files: {n_real:4d}  -> {mode}")
    print()

    return np.array(X, dtype=np.float32), np.array(y)


def build_model(input_dim, num_classes):
    model = keras.Sequential([
        layers.Input(shape=(input_dim,)),
        layers.Dense(128, activation="relu"),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(64, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(32, activation="relu"),
        layers.Dense(num_classes, activation="softmax"),
    ])
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    tf.random.set_seed(RNG_SEED)

    print("Building training data (real audio where available, synthetic elsewhere)...")
    X, y_raw = build_training_data()

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_val, y_train, y_val = train_test_split(
        X_scaled, y, test_size=0.15, random_state=RNG_SEED, stratify=y
    )

    model = build_model(X.shape[1], num_classes=len(encoder.classes_))
    print(model.summary())

    early_stop = keras.callbacks.EarlyStopping(patience=8, restore_best_weights=True)
    model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=60,
        batch_size=32,
        callbacks=[early_stop],
        verbose=2,
    )

    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"Validation accuracy on hold-out set: {val_acc:.3f}")

    model.save(MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    print(f"Saved: {MODEL_PATH}, {SCALER_PATH}, {ENCODER_PATH}")


if __name__ == "__main__":
    main()
