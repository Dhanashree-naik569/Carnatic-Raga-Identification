import os

from flask import Blueprint, request, jsonify

from ragas_data import RAGAS, RAGA_INDEX

dataset_bp = Blueprint("dataset", __name__, url_prefix="/api")

DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")
AUDIO_EXTS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}


@dataset_bp.get("/ragas")
def list_ragas():
    q = (request.args.get("q") or "").strip().lower()
    results = RAGAS
    if q:
        results = [
            r for r in RAGAS
            if q in r["name"].lower() or q in (r.get("mood") or "").lower()
        ]
    return jsonify({"count": len(results), "ragas": results})


@dataset_bp.get("/ragas/<name>")
def get_raga(name):
    raga = RAGA_INDEX.get(name)
    if not raga:
        for r in RAGAS:
            if r["name"].lower() == name.lower():
                raga = r
                break
    if not raga:
        return jsonify({"error": "raga not found"}), 404
    return jsonify(raga)


def _scan_dataset():
    classes = []
    total_files = 0
    if not os.path.isdir(DATASET_DIR):
        return classes, total_files

    for entry in sorted(os.listdir(DATASET_DIR)):
        class_dir = os.path.join(DATASET_DIR, entry)
        if not os.path.isdir(class_dir):
            continue
        audio_files = [
            f for f in os.listdir(class_dir)
            if os.path.splitext(f)[1].lower() in AUDIO_EXTS
        ]
        total_files += len(audio_files)
        classes.append({
            "raga": entry,
            "audio_count": len(audio_files),
            "in_reference_dataset": entry in RAGA_INDEX or any(
                r["name"].replace(" ", "").lower() == entry.replace(" ", "").lower() for r in RAGAS
            ),
        })
    return classes, total_files


@dataset_bp.get("/datasets")
def dataset_overview():
    classes, total_files = _scan_dataset()
    return jsonify({
        "dataset_path": "backend/dataset/",
        "classes": classes,
        "num_classes": len(classes),
        "total_audio_files": total_files,
        "note": (
            "This repository ships with an empty labelled folder structure "
            "(one folder per raga) rather than bundled audio, since Carnatic "
            "recordings are copyrighted / licensed. Populate these folders "
            "with your own licensed recordings, then run `python train.py` "
            "to train on real data. See backend/dataset/<raga>/README.md."
        ),
        "suggested_sources": [
            {"name": "Saraga Carnatic Music Dataset (CompMusic / MTG)", "url": "https://mtg.github.io/saraga/"},
        ],
    })
