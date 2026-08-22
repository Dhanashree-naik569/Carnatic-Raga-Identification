import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'raga_app.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20 MB upload limit
    UPLOAD_EXTENSIONS = {"wav", "mp3", "ogg", "webm", "m4a", "flac"}
    # Speed optimization: audio longer than this is only analyzed up to this
    # many seconds (raga identity is normally clear well within this window).
    # For any file AT OR UNDER this length, this has zero effect — identical
    # behavior to before. Only caps worst-case time for very long uploads.
    ANALYSIS_WINDOW_SECONDS = int(os.environ.get("ANALYSIS_WINDOW_SECONDS", "90"))
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    # Bootstrap admin — created automatically on first run if no admin exists
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@ragavani.local")
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")
