"""
app.py — Flask application factory. Registers every route blueprint and
bootstraps a default admin account on first run.
"""
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models import db, User

from routes.auth_routes import auth_bp
from routes.profile_routes import profile_bp
from routes.predict_routes import predict_bp
from routes.history_routes import history_bp
from routes.dashboard_routes import dashboard_bp
from routes.favorites_routes import favorites_bp
from routes.dataset_routes import dataset_bp
from routes.admin_routes import admin_bp
from routes.keyboard_routes import keyboard_bp


def _bootstrap_admin(app):
    """Creates a default admin account on first run if none exists yet,
    using the credentials in config.py / environment variables."""
    with app.app_context():
        if not User.query.filter_by(is_admin=True).first():
            existing = User.query.filter_by(email=app.config["ADMIN_EMAIL"]).first()
            if existing:
                existing.is_admin = True
                db.session.commit()
                print(f"[bootstrap] Promoted existing user '{existing.email}' to admin.")
            else:
                admin = User(
                    username=app.config["ADMIN_USERNAME"],
                    email=app.config["ADMIN_EMAIL"],
                    is_admin=True,
                    is_verified=True,
                )
                admin.set_password(app.config["ADMIN_PASSWORD"])
                db.session.add(admin)
                db.session.commit()
                print(
                    f"[bootstrap] Created default admin account -> "
                    f"email: {app.config['ADMIN_EMAIL']}  password: {app.config['ADMIN_PASSWORD']}\n"
                    f"[bootstrap] IMPORTANT: change this password after first login."
                )


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    with app.app_context():
        db.create_all()

    _bootstrap_admin(app)

    # Speed optimization: warm up the ENTIRE prediction pipeline at startup
    # (TensorFlow model + scaler + encoder AND librosa's internal one-time
    # JIT compilation), instead of lazily on the first real prediction
    # request. Profiling showed: loading the Keras model itself is fast
    # (<0.5s), but librosa's *first* call in a fresh process pays a
    # one-time internal compilation cost of 10+ seconds (much more on
    # slower machines) that was previously being paid by the first real
    # user request. Running one throwaway prediction on an in-memory
    # synthetic tone (no file I/O, no DB writes, discarded immediately)
    # forces all of that one-time cost to happen now, during startup,
    # so every real prediction afterwards is fast from the start.
    try:
        import time
        import numpy as np
        import soundfile as sf
        import io
        import raga_engine

        t_start = time.time()
        sr = 22050
        t = np.linspace(0, 2, sr * 2, dtype=np.float32)
        tone = (0.2 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
        buf = io.BytesIO()
        sf.write(buf, tone, sr, format="WAV")
        warmup_bytes = buf.getvalue()

        raga_engine.identify_raga(warmup_bytes, include_display_features=True)
        print(f"[startup] Full prediction pipeline warmed up in {time.time() - t_start:.1f}s "
              f"— real predictions will be fast from the first request.")
    except Exception as e:
        print(f"[startup] Pipeline warmup skipped (predictions will still work, "
              f"just slower on the very first request): {e}")

    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(dataset_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(keyboard_bp)   # ← NEW: keyboard / swara API

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "file too large (max 20MB)"}), 413

    return app


app = create_app()

if __name__ == "__main__":
    import os
    debug_mode = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(debug=debug_mode, host="0.0.0.0", port=5000, use_reloader=False)
