"""
keyboard_routes.py — Raga prediction from a swara sequence typed on the
virtual keyboard.  No audio required — pure swara set matching against the
ragas_data templates, plus an ML-model fallback using a synthetic chromagram.
"""
import numpy as np
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ragas_data import RAGAS, RAGA_INDEX, SWARA_NAMES

keyboard_bp = Blueprint("keyboard", __name__, url_prefix="/api/keyboard")

# Build normalised template vectors once at import time
def _template_vector(swaras):
    vec = np.zeros(12, dtype=np.float64)
    for s in swaras:
        vec[int(s) % 12] += 1.0
    n = np.linalg.norm(vec)
    return vec / (n + 1e-9)

TEMPLATES = {r["name"]: _template_vector(r["swaras"]) for r in RAGAS}


def _cosine(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def predict_from_swaras(semitone_sequence: list[int], top_k: int = 5):
    """
    Given a list of semitone indices (0-11 relative to tonic), score every
    raga by:
      1. Pitch-class distribution cosine similarity (always runs).
      2. Swara-set Jaccard overlap bonus.
    Returns ranked list of { raga, confidence, match_details }.
    """
    if not semitone_sequence:
        return []

    # Build query PCD from the played notes
    query_vec = np.zeros(12, dtype=np.float64)
    for s in semitone_sequence:
        query_vec[int(s) % 12] += 1.0
    norm = np.linalg.norm(query_vec)
    query_norm = query_vec / (norm + 1e-9)

    played_set = set(int(s) % 12 for s in semitone_sequence)

    results = []
    for raga in RAGAS:
        name = raga["name"]
        template = TEMPLATES[name]
        raga_set = set(raga["swaras"])

        cosine_score = _cosine(query_norm, template)

        # Jaccard: intersection / union
        intersection = len(played_set & raga_set)
        union = len(played_set | raga_set)
        jaccard = intersection / union if union else 0.0

        # Coverage: what fraction of played notes are in the raga?
        coverage = intersection / len(played_set) if played_set else 0.0

        # Blend: 50% cosine + 30% jaccard + 20% coverage
        blended = 0.50 * cosine_score + 0.30 * jaccard + 0.20 * coverage

        results.append({
            "raga": name,
            "raw_score": round(blended, 6),
            "cosine_score": round(cosine_score, 4),
            "jaccard": round(jaccard, 4),
            "coverage": round(coverage, 4),
            "extra_swaras": sorted(played_set - raga_set),
            "missing_swaras": sorted(raga_set - played_set),
        })

    results.sort(key=lambda x: x["raw_score"], reverse=True)

    # Normalise top_k scores to percentages
    top = results[:top_k]
    total = sum(r["raw_score"] for r in top) or 1.0
    for r in top:
        r["confidence"] = round(r["raw_score"] / total * 100, 2)

    return top


@keyboard_bp.post("/predict")
@jwt_required(optional=True)
def keyboard_predict():
    """
    Body (JSON):
      {
        "swaras": [0, 2, 4, 5, 7, 9, 11],   // semitone offsets
        "top_k": 5                            // optional, default 5
      }
    """
    data = request.get_json(silent=True) or {}
    swaras = data.get("swaras", [])
    top_k = min(int(data.get("top_k", 5)), 10)

    if not isinstance(swaras, list):
        return jsonify({"error": "'swaras' must be a list of integers"}), 400
    if len(swaras) == 0:
        return jsonify({"error": "No swaras provided — play at least one note"}), 400
    if len(swaras) > 200:
        return jsonify({"error": "Too many notes (max 200)"}), 400

    # Validate values
    swaras = [int(s) for s in swaras if 0 <= int(s) <= 11]

    top = predict_from_swaras(swaras, top_k=top_k)
    if not top:
        return jsonify({"error": "Could not match any raga"}), 422

    # Attach full raga metadata to top prediction
    top_name = top[0]["raga"]
    raga_detail = RAGA_INDEX.get(top_name, {})

    # Unique pitch classes played
    unique_pcs = sorted(set(int(s) % 12 for s in swaras))
    swara_names_played = [SWARA_NAMES[s] for s in unique_pcs]

    return jsonify({
        "prediction": top_name,
        "confidence": top[0]["confidence"],
        "top_k": top,
        "raga_detail": raga_detail,
        "played_swaras": swaras,
        "unique_pitch_classes": unique_pcs,
        "swara_names": swara_names_played,
        "note_count": len(swaras),
    })


@keyboard_bp.get("/swara-map")
def swara_map():
    """Returns the full semitone → swara name mapping plus keyboard key bindings."""
    mapping = []
    key_bindings_white = ["a", "s", "d", "f", "g", "h", "j", "k"]
    key_bindings_black = ["w", "e", "t", "y", "u", "i"]

    # White keys: Sa(0), Ri2(2), Ga3(4), Ma1(5), Pa(7), Da2(9), Ni3(11)
    # Black keys: Ri1(1), Ga2(3), Ma2(6), Da1(8), Ni2(10)
    white_semitones = [0, 2, 4, 5, 7, 9, 11]
    black_semitones = [1, 3, 6, 8, 10]

    wb_idx = 0
    bk_idx = 0
    for semi in range(12):
        name = SWARA_NAMES[semi]
        is_black = semi in black_semitones
        key = None
        if is_black and bk_idx < len(key_bindings_black):
            key = key_bindings_black[bk_idx]
            bk_idx += 1
        elif not is_black and wb_idx < len(key_bindings_white):
            key = key_bindings_white[wb_idx]
            wb_idx += 1
        mapping.append({
            "semitone": semi,
            "name": name,
            "is_black_key": is_black,
            "keyboard_key": key,
        })

    return jsonify({"swaras": mapping})
