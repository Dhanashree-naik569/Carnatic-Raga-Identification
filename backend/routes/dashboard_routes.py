from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import Prediction, Favorite

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.get("/stats")
@jwt_required()
def stats():
    user_id = int(get_jwt_identity())
    preds = Prediction.query.filter_by(user_id=user_id).all()

    counts = {}
    for p in preds:
        counts[p.predicted_raga] = counts.get(p.predicted_raga, 0) + 1
    distribution = [{"raga": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]

    avg_conf = round(sum(p.confidence for p in preds) / len(preds), 2) if preds else 0

    # weekly activity: predictions per day for the last 7 days
    today = datetime.utcnow().date()
    week_counts = {(today - timedelta(days=i)).isoformat(): 0 for i in range(6, -1, -1)}
    for p in preds:
        day = p.created_at.date().isoformat()
        if day in week_counts:
            week_counts[day] += 1
    weekly_activity = [{"date": d, "count": c} for d, c in week_counts.items()]

    favorites = Favorite.query.filter_by(user_id=user_id).order_by(Favorite.created_at.desc()).all()

    return jsonify({
        "total_predictions": len(preds),
        "unique_ragas_detected": len(counts),
        "average_confidence": avg_conf,
        "raga_distribution": distribution,
        "weekly_activity": weekly_activity,
        "favorite_ragas": [f.to_dict() for f in favorites],
        "recent": [p.to_dict() for p in sorted(preds, key=lambda p: p.created_at, reverse=True)[:5]],
    })
