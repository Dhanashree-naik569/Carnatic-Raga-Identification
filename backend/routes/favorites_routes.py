from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, Favorite
from ragas_data import RAGA_INDEX

favorites_bp = Blueprint("favorites", __name__, url_prefix="/api/favorites")


@favorites_bp.get("")
@jwt_required()
def list_favorites():
    user_id = int(get_jwt_identity())
    favs = Favorite.query.filter_by(user_id=user_id).order_by(Favorite.created_at.desc()).all()
    return jsonify({"favorites": [f.to_dict() for f in favs]})


@favorites_bp.post("")
@jwt_required()
def add_favorite():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    raga_name = (data.get("raga_name") or "").strip()

    if raga_name not in RAGA_INDEX:
        return jsonify({"error": "unknown raga"}), 400
    if Favorite.query.filter_by(user_id=user_id, raga_name=raga_name).first():
        return jsonify({"message": "already a favorite"}), 200

    fav = Favorite(user_id=user_id, raga_name=raga_name)
    db.session.add(fav)
    db.session.commit()
    return jsonify({"favorite": fav.to_dict()}), 201


@favorites_bp.delete("/<raga_name>")
@jwt_required()
def remove_favorite(raga_name):
    user_id = int(get_jwt_identity())
    fav = Favorite.query.filter_by(user_id=user_id, raga_name=raga_name).first()
    if not fav:
        return jsonify({"error": "not found"}), 404
    db.session.delete(fav)
    db.session.commit()
    return jsonify({"removed": raga_name})
