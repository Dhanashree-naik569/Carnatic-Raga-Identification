"""
raga_engine.py — orchestrates the full identification pipeline:

1. preprocess audio (preprocess.py)
2. extract the fixed-length feature vector (feature_extraction.py) and the
   richer display features (waveform, spectrogram, chroma matrix, etc.)
3. score against raga swara templates via pitch-class rotation matching
   (signal-derived, always available, musically transparent)
4. score via the trained Keras model (predict.py) if model artifacts exist
5. blend both signals into a final ranked prediction

PERFORMANCE NOTE (optimization pass): shared librosa features (MFCC,
Chroma, Spectral Contrast, Tonnetz, etc.) are now computed exactly ONCE per
request via feature_extraction._compute_raw_features(), and reused for the
pitch-class distribution, the ML feature vector, and the UI display
payload — previously these were computed 2-3 times independently. This is
a pure speed optimization; the numeric results are unchanged.

ANALYSIS_WINDOW_SECONDS (config.py) bounds worst-case processing time for
very long uploads (e.g. full concert recordings). For any file at or under
that length, this is a complete no-op — identical output to before. Only
uploads longer than the window get capped, which keeps prediction fast for
large files without touching short/typical clips at all.

See train.py and predict.py for details on the ML model, and README.md for
an honest discussion of its current (synthetic-data) training regime.
"""
import numpy as np

from preprocess import preprocess_audio
from feature_extraction import _compute_raw_features, extract_feature_vector, extract_display_features
from ragas_data import RAGAS
from config import Config
import predict as keras_predict

RAGA_NAMES = [r["name"] for r in RAGAS]


def _template_vector(swaras):
    vec = np.zeros(12, dtype=np.float64)
    for s in swaras:
        vec[s % 12] = 1.0
    return vec / (np.linalg.norm(vec) + 1e-9)


TEMPLATES = {r["name"]: _template_vector(r["swaras"]) for r in RAGAS}


def best_rotation_match(pcd):
    results = []
    for rot in range(12):
        rotated = np.roll(pcd, -rot)
        for name, template in TEMPLATES.items():
            score = float(np.dot(rotated, template))
            results.append((name, rot, score))
    results.sort(key=lambda x: x[2], reverse=True)
    return results


def identify_raga(file_bytes, top_k=5, include_display_features=True):
    analysis_window = getattr(Config, "ANALYSIS_WINDOW_SECONDS", None)
    y, sr = preprocess_audio(file_bytes, duration=analysis_window if analysis_window else None)

    # Compute shared features exactly once (was previously duplicated
    # across the PCD, ML feature vector, and display-feature computations).
    raw = _compute_raw_features(y, sr)

    chroma = raw["chroma"]
    pcd = chroma.mean(axis=1)
    pcd = pcd / (np.linalg.norm(pcd) + 1e-9)

    ranked = best_rotation_match(pcd)

    best_per_raga = {}
    for name, rot, score in ranked:
        if name not in best_per_raga or score > best_per_raga[name][1]:
            best_per_raga[name] = (rot, score)
    template_ranked = sorted(best_per_raga.items(), key=lambda kv: kv[1][1], reverse=True)

    # Keras model pass (if trained) — reuses the shared raw features
    feature_vec = extract_feature_vector(y, sr, raw=raw)
    ml_probs = keras_predict.get_keras_probabilities(feature_vec)

    scores = np.array([s for _, (_, s) in template_ranked])
    scores_norm = (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)

    combined = []
    for i, (name, (rot, score)) in enumerate(template_ranked):
        template_component = float(scores_norm[i])
        ml_component = ml_probs.get(name, 0.0) if ml_probs else template_component
        blended = 0.5 * template_component + 0.5 * ml_component
        combined.append({
            "raga": name,
            "confidence": round(blended * 100, 2),
            "template_score": round(float(score), 4),
            "estimated_tonic_semitone_offset": int(rot),
        })

    combined.sort(key=lambda x: x["confidence"], reverse=True)
    total = sum(c["confidence"] for c in combined[:top_k]) or 1.0
    for c in combined[:top_k]:
        c["confidence"] = round(c["confidence"] / total * 100, 2)

    result = {
        "prediction": combined[0]["raga"],
        "confidence": combined[0]["confidence"],
        "alternatives": combined[1:top_k],
        "top_k": combined[:top_k],
        "pitch_class_distribution": [round(float(v), 4) for v in pcd.tolist()],
        "estimated_tonic_semitone_offset": combined[0]["estimated_tonic_semitone_offset"],
        "used_ml_model": ml_probs is not None,
    }

    if include_display_features:
        # Reuses the same shared raw features — no recomputation.
        result["features"] = extract_display_features(y, sr, raw=raw)

    return result
