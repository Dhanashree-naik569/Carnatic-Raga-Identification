from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from models import User


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = User.query.get(int(get_jwt_identity()))
        if not user or not user.is_admin:
            return jsonify({"error": "admin privileges required"}), 403
        return fn(*args, **kwargs)
    return wrapper
