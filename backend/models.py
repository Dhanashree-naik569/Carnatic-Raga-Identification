import json
import secrets
from datetime import datetime, timedelta

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    predictions = db.relationship(
        "Prediction", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    favorites = db.relationship(
        "Favorite", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "is_admin": self.is_admin,
            "is_verified": self.is_verified,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    source = db.Column(db.String(20), default="upload")  # "upload" or "live"
    filename = db.Column(db.String(255))
    predicted_raga = db.Column(db.String(120), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    top_k_json = db.Column(db.Text)  # JSON-encoded list of {raga, confidence}
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "filename": self.filename,
            "predicted_raga": self.predicted_raga,
            "confidence": self.confidence,
            "top_k": json.loads(self.top_k_json) if self.top_k_json else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Favorite(db.Model):
    __tablename__ = "favorites"
    __table_args__ = (db.UniqueConstraint("user_id", "raga_name", name="uq_user_raga"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    raga_name = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "raga_name": self.raga_name, "created_at": self.created_at.isoformat()}


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(hours=1))
    used = db.Column(db.Boolean, default=False)

    def is_valid(self):
        return not self.used and datetime.utcnow() < self.expires_at


class EmailVerificationToken(db.Model):
    __tablename__ = "email_verification_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=2))
    used = db.Column(db.Boolean, default=False)

    def is_valid(self):
        return not self.used and datetime.utcnow() < self.expires_at


class TrainingLog(db.Model):
    __tablename__ = "training_logs"

    id = db.Column(db.Integer, primary_key=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime)
    status = db.Column(db.String(20), default="running")  # running, success, failed
    message = db.Column(db.Text)

    def to_dict(self):
        return {
            "id": self.id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "status": self.status,
            "message": self.message,
        }
