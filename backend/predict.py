"""
predict.py — loads model.h5 + scaler.pkl + label_encoder.pkl and predicts
raga probabilities from an audio file. Usable both as a CLI tool and as an
importable module (raga_engine.py uses get_keras_probabilities()).

CLI usage:
    python predict.py path/to/clip.wav
"""

import os
import sys
import json
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MODEL_PATH = os.path.join(MODEL_DIR, "model.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")

_model = None
_scaler = None
_encoder = None
_load_attempted = False


def _lazy_load():
    """Load model, scaler and encoder only once."""
    global _model, _scaler, _encoder, _load_attempted

    if _load_attempted:
        return

    _load_attempted = True

    try:
        import joblib
        from tensorflow import keras

        if (
            os.path.exists(MODEL_PATH)
            and os.path.exists(SCALER_PATH)
            and os.path.exists(ENCODER_PATH)
        ):
            _model = keras.models.load_model(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            _encoder = joblib.load(ENCODER_PATH)

    except Exception as e:
        print(f"[predict.py] Could not load model: {e}", file=sys.stderr)
        _model = None


def model_available():
    _lazy_load()
    return _model is not None


def get_keras_probabilities(feature_vector):
    """
    feature_vector: 1D numpy array.
    Returns dict {raga_name: probability}
    """

    _lazy_load()

    if _model is None:
        return None

    X = _scaler.transform(feature_vector.reshape(1, -1))
    proba = _model.predict(X, verbose=0)[0]
    classes = _encoder.inverse_transform(np.arange(len(proba)))

    print("\n========== MODEL OUTPUT ==========")
    for c, p in zip(classes, proba):
        print(f"{c:20} {p:.5f}")
    print("==================================\n")

    return dict(zip(classes, proba.tolist()))


def predict_file(path):
    from preprocess import preprocess_audio
    from feature_extraction import extract_feature_vector

    y, sr = preprocess_audio(path)
    vec = extract_feature_vector(y, sr)

    probs = get_keras_probabilities(vec)

    if probs is None:
        return {
            "error": "Model not trained yet. Run python train.py first."
        }

    ranked = sorted(probs.items(), key=lambda x: x[1], reverse=True)

    return {
        "prediction": ranked[0][0],
        "confidence": round(ranked[0][1] * 100, 2),
        "top_5": [
            {
                "raga": r,
                "confidence": round(p * 100, 2)
            }
            for r, p in ranked[:5]
        ],
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python predict.py <audio_file>")
        sys.exit(1)

    result = predict_file(sys.argv[1])
    print(json.dumps(result, indent=2))