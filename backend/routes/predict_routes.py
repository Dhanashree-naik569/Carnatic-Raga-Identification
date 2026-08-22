import json

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from config import Config
from models import db, Prediction
import raga_engine

predict_bp = Blueprint("predict", __name__, url_prefix="/api/predict")

ALLOWED_EXTS = Config.UPLOAD_EXTENSIONS


def _allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS


@predict_bp.post("")
@jwt_required()
def predict():
    if "audio" not in request.files:
        return jsonify({"error": "no audio file provided (field name must be 'audio')"}), 400

    file = request.files["audio"]
    source = request.form.get("source", "upload")
    filename = file.filename or ("live_recording.webm" if source == "live" else "upload")

    if source != "live" and filename != "" and not _allowed_file(filename):
        return jsonify({"error": f"unsupported file type. Allowed: {sorted(ALLOWED_EXTS)}"}), 400

    try:
        file_bytes = file.read()

        print("\n========== REQUEST ==========")
        print("Source:", source)
        print("Filename:", filename)
        print("Bytes:", len(file_bytes))
        print("=============================\n")

        if not file_bytes:
            return jsonify({"error": "uploaded file is empty"}), 400

        result = raga_engine.identify_raga(file_bytes)

    except Exception as e:
        return jsonify({
            "error": "could not analyze audio. Ensure it is a valid audio file/recording with clear melodic content, and that ffmpeg is installed for non-wav formats.",
            "detail": str(e),
        }), 422

    user_id = int(get_jwt_identity())

    pred = Prediction(
        user_id=user_id,
        source=source,
        filename=filename,
        predicted_raga=result["prediction"],
        confidence=result["confidence"],
        top_k_json=json.dumps(result["top_k"]),
    )

    db.session.add(pred)
    db.session.commit()

    result["history_id"] = pred.id

    return jsonify(result)