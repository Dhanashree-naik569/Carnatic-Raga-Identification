from datetime import timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from models import db, User, EmailVerificationToken, PasswordResetToken
from utils.email_utils import send_verification_email, send_password_reset_email

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "username, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "an account with this email already exists"}), 409
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "this username is taken"}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    verify_token = EmailVerificationToken(user_id=user.id)
    db.session.add(verify_token)
    db.session.commit()
    send_verification_email(user.email, verify_token.token, current_app.config["FRONTEND_URL"])

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    remember_me = bool(data.get("remember_me"))

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid email or password"}), 401
    if not user.is_active:
        return jsonify({"error": "this account has been deactivated"}), 403

    expires = timedelta(days=30) if remember_me else timedelta(days=1)
    token = create_access_token(identity=str(user.id), expires_delta=expires)
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify({"user": user.to_dict()})


@auth_bp.post("/verify-email")
def verify_email():
    data = request.get_json(silent=True) or {}
    token_str = data.get("token")
    if not token_str:
        return jsonify({"error": "token is required"}), 400

    token = EmailVerificationToken.query.filter_by(token=token_str).first()
    if not token or not token.is_valid():
        return jsonify({"error": "invalid or expired verification link"}), 400

    user = User.query.get(token.user_id)
    user.is_verified = True
    token.used = True
    db.session.commit()
    return jsonify({"message": "email verified successfully", "user": user.to_dict()})


@auth_bp.post("/resend-verification")
@jwt_required()
def resend_verification():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "user not found"}), 404
    if user.is_verified:
        return jsonify({"message": "already verified"})

    token = EmailVerificationToken(user_id=user.id)
    db.session.add(token)
    db.session.commit()
    send_verification_email(user.email, token.token, current_app.config["FRONTEND_URL"])
    return jsonify({"message": "verification email sent"})


@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()

    # Always return success (don't leak which emails are registered)
    if user:
        token = PasswordResetToken(user_id=user.id)
        db.session.add(token)
        db.session.commit()
        send_password_reset_email(user.email, token.token, current_app.config["FRONTEND_URL"])

    return jsonify({"message": "if that email is registered, a reset link has been sent"})


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    token_str = data.get("token")
    new_password = data.get("password") or ""

    if not token_str or len(new_password) < 6:
        return jsonify({"error": "a valid token and a password of at least 6 characters are required"}), 400

    token = PasswordResetToken.query.filter_by(token=token_str).first()
    if not token or not token.is_valid():
        return jsonify({"error": "invalid or expired reset link"}), 400

    user = User.query.get(token.user_id)
    user.set_password(new_password)
    token.used = True
    db.session.commit()
    return jsonify({"message": "password reset successfully"})
