import os
import threading
import traceback
from datetime import datetime

from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from models import db, User, Prediction, TrainingLog
from utils.decorators import admin_required
from routes.dataset_routes import _scan_dataset, DATASET_DIR, AUDIO_EXTS

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# --------------------------------------------------------------- users
@admin_bp.get("/users")
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]})


@admin_bp.patch("/users/<int:user_id>")
@admin_required
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    data = request.get_json(silent=True) or {}
    if "is_admin" in data:
        user.is_admin = bool(data["is_admin"])
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    db.session.commit()
    return jsonify({"user": user.to_dict()})


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({"deleted": user_id})


# --------------------------------------------------------------- dataset
@admin_bp.get("/dataset")
@admin_required
def admin_dataset():
    classes, total_files = _scan_dataset()
    return jsonify({"classes": classes, "num_classes": len(classes), "total_audio_files": total_files})


@admin_bp.post("/dataset/upload")
@admin_required
def upload_dataset_file():
    raga_name = (request.form.get("raga_name") or "").strip()
    if not raga_name:
        return jsonify({"error": "raga_name is required"}), 400
    if "audio" not in request.files:
        return jsonify({"error": "no audio file provided (field name must be 'audio')"}), 400

    file = request.files["audio"]
    filename = secure_filename(file.filename or "")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in AUDIO_EXTS:
        return jsonify({"error": f"unsupported extension. Allowed: {sorted(AUDIO_EXTS)}"}), 400

    class_dir = os.path.join(DATASET_DIR, secure_filename(raga_name))
    os.makedirs(class_dir, exist_ok=True)
    save_path = os.path.join(class_dir, filename)
    file.save(save_path)

    return jsonify({"message": "file uploaded", "path": f"dataset/{raga_name}/{filename}"}), 201


# --------------------------------------------------------------- retrain
def _run_training(app, log_id):
    with app.app_context():
        log = TrainingLog.query.get(log_id)
        try:
            import train as train_module
            train_module.main()
            log.status = "success"
            log.message = "Training completed successfully. Model artifacts updated in backend/model/."
        except Exception as e:
            log.status = "failed"
            log.message = f"{e}\n{traceback.format_exc()}"
        finally:
            log.finished_at = datetime.utcnow()
            db.session.commit()


@admin_bp.post("/retrain")
@admin_required
def retrain():
    log = TrainingLog(status="running", message="Training started...")
    db.session.add(log)
    db.session.commit()

    app = current_app._get_current_object()
    thread = threading.Thread(target=_run_training, args=(app, log.id), daemon=True)
    thread.start()

    return jsonify({"message": "retraining started in the background", "log_id": log.id}), 202


@admin_bp.get("/logs")
@admin_required
def logs():
    training_logs = TrainingLog.query.order_by(TrainingLog.started_at.desc()).limit(50).all()
    return jsonify({"training_logs": [l.to_dict() for l in training_logs]})


# --------------------------------------------------------------- stats
@admin_bp.get("/stats")
@admin_required
def admin_stats():
    total_users = User.query.count()
    total_predictions = Prediction.query.count()
    verified_users = User.query.filter_by(is_verified=True).count()

    counts = {}
    for p in Prediction.query.all():
        counts[p.predicted_raga] = counts.get(p.predicted_raga, 0) + 1
    top_ragas = sorted(counts.items(), key=lambda x: -x[1])[:10]

    classes, total_files = _scan_dataset()

    return jsonify({
        "total_users": total_users,
        "verified_users": verified_users,
        "total_predictions": total_predictions,
        "top_predicted_ragas": [{"raga": r, "count": c} for r, c in top_ragas],
        "dataset_classes": len(classes),
        "dataset_audio_files": total_files,
    })
