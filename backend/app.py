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
    using the credentials in config.py / environment variables.
    """
    with app.app_context():
        if not User.query.filter_by(is_admin=True).first():
            existing = User.query.filter_by(
                email=app.config["ADMIN_EMAIL"]
            ).first()

            if existing:
                existing.is_admin = True
                db.session.commit()

                print(
                    f"[bootstrap] Promoted existing user "
                    f"'{existing.email}' to admin."
                )

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
                    f"email: {app.config['ADMIN_EMAIL']}  "
                    f"password: {app.config['ADMIN_PASSWORD']}\n"
                    f"[bootstrap] IMPORTANT: change this password after "
                    f"first login."
                )


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # --------------------------------------------------------
    # DATABASE / JWT / CORS
    # --------------------------------------------------------

    db.init_app(app)
    JWTManager(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*"
            }
        },
    )

    with app.app_context():
        db.create_all()

    _bootstrap_admin(app)

    # --------------------------------------------------------
    # PREDICTION PIPELINE WARMUP
    # --------------------------------------------------------

    try:
        import time
        import io

        import numpy as np
        import soundfile as sf

        import raga_engine

        t_start = time.time()

        sr = 22050

        t = np.linspace(
            0,
            2,
            sr * 2,
            dtype=np.float32,
        )

        tone = (
            0.2
            * np.sin(
                2 * np.pi * 220 * t
            )
        ).astype(np.float32)

        buf = io.BytesIO()

        sf.write(
            buf,
            tone,
            sr,
            format="WAV",
        )

        warmup_bytes = buf.getvalue()

        raga_engine.identify_raga(
            warmup_bytes,
            include_display_features=True,
        )

        print(
            f"[startup] Full prediction pipeline warmed up "
            f"in {time.time() - t_start:.1f}s — "
            f"real predictions will be fast from the first request."
        )

    except Exception as e:
        print(
            "[startup] Pipeline warmup skipped "
            f"(predictions will still work, just slower "
            f"on the very first request): {e}"
        )

    # --------------------------------------------------------
    # BLUEPRINTS
    # --------------------------------------------------------

    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(dataset_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(keyboard_bp)

    # --------------------------------------------------------
    # HEALTH CHECK
    # --------------------------------------------------------

    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "ok"
        })

    # --------------------------------------------------------
    # FILE SIZE ERROR
    # --------------------------------------------------------

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({
            "error": "file too large (max 20MB)"
        }), 413

    return app


# ------------------------------------------------------------
# FLASK APPLICATION INSTANCE
# ------------------------------------------------------------

app = create_app()


# ------------------------------------------------------------
# LOCAL DEVELOPMENT
# ------------------------------------------------------------

if __name__ == "__main__":
    import os

    debug_mode = (
        os.environ.get("FLASK_DEBUG", "1") == "1"
    )

    app.run(
        debug=debug_mode,
        host="0.0.0.0",
        port=5000,
        use_reloader=False,
    )