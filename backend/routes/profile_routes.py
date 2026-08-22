from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@profile_bp.get("")
@jwt_required()
def get_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify({"user": user.to_dict()})


@profile_bp.put("")
@jwt_required()
def update_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "user not found"}), 404

    data = request.get_json(silent=True) or {}
    new_username = (data.get("username") or "").strip()

    if new_username and new_username != user.username:
        if User.query.filter_by(username=new_username).first():
            return jsonify({"error": "this username is taken"}), 409
        user.username = new_username

    db.session.commit()
    return jsonify({"user": user.to_dict()})


@profile_bp.post("/change-password")
@jwt_required()
def change_password():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "user not found"}), 404

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not user.check_password(current_password):
        return jsonify({"error": "current password is incorrect"}), 401
    if len(new_password) < 6:
        return jsonify({"error": "new password must be at least 6 characters"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "password changed successfully"})
