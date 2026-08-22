from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Prediction

history_bp = Blueprint("history", __name__, url_prefix="/api/history")


@history_bp.get("")
@jwt_required()
def history():
    user_id = int(get_jwt_identity())
    q = (request.args.get("q") or "").strip().lower()
    raga_filter = (request.args.get("raga") or "").strip()
    source_filter = (request.args.get("source") or "").strip()

    query = Prediction.query.filter_by(user_id=user_id)
    if raga_filter:
        query = query.filter(Prediction.predicted_raga == raga_filter)
    if source_filter:
        query = query.filter(Prediction.source == source_filter)

    preds = query.order_by(Prediction.created_at.desc()).all()

    if q:
        preds = [p for p in preds if q in p.predicted_raga.lower() or q in (p.filename or "").lower()]

    return jsonify({"count": len(preds), "history": [p.to_dict() for p in preds]})


@history_bp.delete("/<int:pred_id>")
@jwt_required()
def delete_history(pred_id):
    user_id = int(get_jwt_identity())
    pred = Prediction.query.filter_by(id=pred_id, user_id=user_id).first()
    if not pred:
        return jsonify({"error": "not found"}), 404
    db.session.delete(pred)
    db.session.commit()
    return jsonify({"deleted": pred_id})


@history_bp.delete("")
@jwt_required()
def clear_history():
    """Delete every prediction belonging to the current user."""
    user_id = int(get_jwt_identity())
    deleted = Prediction.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"deleted": deleted})
