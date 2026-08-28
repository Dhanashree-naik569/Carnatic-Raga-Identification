"""
train.py
--------
Train the Carnatic Raga classifier using ONLY real audio files
available in backend/dataset.

The dataset folders themselves define the class names.

Current expected structure:

backend/
    dataset/
        Anandabhairavi/
        Bhairavi/
        Bilahari/
        Bowli/
        Dwijavanthi/
        Gaanamurthe/
        Hamsadhwani/
        Neelambari/
        Poorvikalyani/
        Saveri/
        Thodi/

Each folder should contain .wav/.mp3/.flac/.ogg/.m4a files.
"""

import os
import sys

import numpy as np
import joblib

from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

from feature_extraction import (
    FEATURE_VECTOR_SIZE,
    extract_feature_vector,
)
from preprocess import preprocess_audio


# ============================================================
# PATHS
# ============================================================

MODEL_DIR = os.path.join(
    os.path.dirname(__file__),
    "model"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "model.h5"
)

SCALER_PATH = os.path.join(
    MODEL_DIR,
    "scaler.pkl"
)

ENCODER_PATH = os.path.join(
    MODEL_DIR,
    "label_encoder.pkl"
)

DATASET_DIR = os.path.join(
    os.path.dirname(__file__),
    "dataset"
)


# ============================================================
# SETTINGS
# ============================================================

AUDIO_EXTS = {
    ".wav",
    ".mp3",
    ".flac",
    ".ogg",
    ".m4a",
}

RNG_SEED = 42

# Number of augmented copies generated from each training recording.
AUGMENTATIONS_PER_FILE = 8

# Small feature-level jitter.
JITTER_STD = 0.025


# ============================================================
# FIND REAL DATASET CLASSES
# ============================================================

def find_dataset_classes():
    """
    Find only folders that contain real audio files.

    The folder name becomes the class name.
    """

    if not os.path.isdir(DATASET_DIR):
        raise FileNotFoundError(
            f"Dataset directory not found:\n{DATASET_DIR}"
        )

    classes = []

    for folder_name in sorted(os.listdir(DATASET_DIR)):
        folder_path = os.path.join(
            DATASET_DIR,
            folder_name
        )

        if not os.path.isdir(folder_path):
            continue

        audio_files = [
            f
            for f in os.listdir(folder_path)
            if os.path.splitext(f)[1].lower() in AUDIO_EXTS
        ]

        if audio_files:
            classes.append({
                "name": folder_name,
                "path": folder_path,
                "files": sorted(audio_files),
            })

    return classes


# ============================================================
# EXTRACT FEATURES
# ============================================================

def extract_dataset_features(classes):
    """
    Extract one 85-dimensional feature vector from every
    real audio recording.
    """

    all_vectors = []
    all_labels = []

    print()
    print("=" * 70)
    print("EXTRACTING FEATURES FROM REAL AUDIO")
    print("=" * 70)

    for class_info in classes:

        class_name = class_info["name"]
        files = class_info["files"]
        folder_path = class_info["path"]

        print()
        print(
            f"{class_name}: {len(files)} audio files"
        )

        successful = 0

        for index, filename in enumerate(files, start=1):

            path = os.path.join(
                folder_path,
                filename
            )

            try:
                y_audio, sr = preprocess_audio(path)

                vector = extract_feature_vector(
                    y_audio,
                    sr
                )

                if len(vector) != FEATURE_VECTOR_SIZE:
                    print(
                        f"  [skip] {filename}: "
                        f"expected {FEATURE_VECTOR_SIZE} features, "
                        f"got {len(vector)}"
                    )
                    continue

                all_vectors.append(vector)
                all_labels.append(class_name)

                successful += 1

                print(
                    f"  [{index}/{len(files)}] OK: {filename}"
                )

            except Exception as e:

                print(
                    f"  [skip] {filename}: {e}",
                    file=sys.stderr
                )

        print(
            f"  Successfully extracted: "
            f"{successful}/{len(files)}"
        )

    if not all_vectors:
        raise RuntimeError(
            "No valid audio features were extracted."
        )

    X = np.asarray(
        all_vectors,
        dtype=np.float32
    )

    y = np.asarray(
        all_labels
    )

    return X, y


# ============================================================
# AUGMENT TRAINING DATA
# ============================================================

def augment_training_data(
    X_train,
    y_train,
    augmentations_per_file=AUGMENTATIONS_PER_FILE
):
    """
    Add small feature-space jitter to training samples.

    Original samples are retained.
    Validation data is NEVER augmented.
    """

    rng = np.random.default_rng(
        RNG_SEED
    )

    augmented_X = [X_train]
    augmented_y = [y_train]

    for _ in range(augmentations_per_file):

        noise = rng.normal(
            0,
            JITTER_STD,
            size=X_train.shape
        ).astype(np.float32)

        X_aug = X_train + noise

        augmented_X.append(X_aug)
        augmented_y.append(y_train.copy())

    return (
        np.concatenate(
            augmented_X,
            axis=0
        ),
        np.concatenate(
            augmented_y,
            axis=0
        )
    )


# ============================================================
# MODEL
# ============================================================

def build_model(
    input_dim,
    num_classes
):

    model = keras.Sequential([
        layers.Input(
            shape=(input_dim,)
        ),

        layers.Dense(
            128,
            activation="relu"
        ),

        layers.BatchNormalization(),

        layers.Dropout(
            0.30
        ),

        layers.Dense(
            64,
            activation="relu"
        ),

        layers.Dropout(
            0.20
        ),

        layers.Dense(
            32,
            activation="relu"
        ),

        layers.Dense(
            num_classes,
            activation="softmax"
        ),
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(
            learning_rate=0.001
        ),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


# ============================================================
# MAIN
# ============================================================

def main():

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    np.random.seed(
        RNG_SEED
    )

    tf.random.set_seed(
        RNG_SEED
    )

    print()
    print("=" * 70)
    print("CARNATIC RAGA MODEL TRAINING")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Find classes
    # --------------------------------------------------------

    classes = find_dataset_classes()

    if not classes:
        raise RuntimeError(
            "No dataset folders containing audio files were found."
        )

    print()
    print("REAL DATASET CLASSES")
    print("-" * 70)

    total_files = 0

    for class_info in classes:

        count = len(
            class_info["files"]
        )

        total_files += count

        print(
            f"{class_info['name']:25s} : {count} files"
        )

    print("-" * 70)

    print(
        f"Total classes : {len(classes)}"
    )

    print(
        f"Total files   : {total_files}"
    )

    # --------------------------------------------------------
    # 2. Extract features
    # --------------------------------------------------------

    X, y_raw = extract_dataset_features(
        classes
    )

    print()
    print("=" * 70)
    print("RAW DATASET")
    print("=" * 70)

    print(
        "Feature matrix:",
        X.shape
    )

    print(
        "Labels:",
        len(y_raw)
    )

    # --------------------------------------------------------
    # 3. Encode labels
    # --------------------------------------------------------

    encoder = LabelEncoder()

    y = encoder.fit_transform(
        y_raw
    )

    print()
    print("CLASSES USED BY MODEL")
    print("-" * 70)

    for index, class_name in enumerate(
        encoder.classes_
    ):
        count = np.sum(
            y_raw == class_name
        )

        print(
            f"{index:2d} : {class_name:25s} "
            f"({count} recordings)"
        )

    # --------------------------------------------------------
    # 4. Split ORIGINAL recordings
    # --------------------------------------------------------

    X_train, X_val, y_train, y_val = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RNG_SEED,
        stratify=y,
    )

    print()
    print("=" * 70)
    print("TRAIN / VALIDATION SPLIT")
    print("=" * 70)

    print(
        "Original training samples  :",
        len(X_train)
    )

    print(
        "Original validation samples:",
        len(X_val)
    )

    # --------------------------------------------------------
    # 5. Augment ONLY training data
    # --------------------------------------------------------

    X_train_aug, y_train_aug = augment_training_data(
        X_train,
        y_train
    )

    print()
    print(
        "Training samples after augmentation:",
        len(X_train_aug)
    )

    print(
        "Validation samples:",
        len(X_val)
    )

    # --------------------------------------------------------
    # 6. Scale features
    # --------------------------------------------------------

    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(
        X_train_aug
    )

    X_val_scaled = scaler.transform(
        X_val
    )

    # --------------------------------------------------------
    # 7. Build model
    # --------------------------------------------------------

    model = build_model(
        input_dim=X_train_scaled.shape[1],
        num_classes=len(
            encoder.classes_
        ),
    )

    print()
    model.summary()

    # --------------------------------------------------------
    # 8. Train
    # --------------------------------------------------------

    early_stop = keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=10,
        restore_best_weights=True,
    )

    reduce_lr = keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=4,
        min_lr=1e-6,
    )

    print()
    print("=" * 70)
    print("STARTING TRAINING")
    print("=" * 70)

    model.fit(
        X_train_scaled,
        y_train_aug,
        validation_data=(
            X_val_scaled,
            y_val
        ),
        epochs=80,
        batch_size=16,
        callbacks=[
            early_stop,
            reduce_lr,
        ],
        verbose=2,
    )

    # --------------------------------------------------------
    # 9. Evaluate
    # --------------------------------------------------------

    val_loss, val_acc = model.evaluate(
        X_val_scaled,
        y_val,
        verbose=0
    )

    print()
    print("=" * 70)
    print("VALIDATION RESULT")
    print("=" * 70)

    print(
        f"Validation loss     : {val_loss:.4f}"
    )

    print(
        f"Validation accuracy : {val_acc:.4f}"
    )

    # --------------------------------------------------------
    # 10. Save model
    # --------------------------------------------------------

    model.save(
        MODEL_PATH
    )

    joblib.dump(
        scaler,
        SCALER_PATH
    )

    joblib.dump(
        encoder,
        ENCODER_PATH
    )

    print()
    print("=" * 70)
    print("MODEL FILES SAVED")
    print("=" * 70)

    print(
        MODEL_PATH
    )

    print(
        SCALER_PATH
    )

    print(
        ENCODER_PATH
    )

    print()
    print("Training completed successfully.")


if __name__ == "__main__":
    main()