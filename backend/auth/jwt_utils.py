"""JWT utilities and Flask auth decorator."""
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import request, jsonify, g
from jose import JWTError, jwt

from config import AUTH_SECRET_KEY, AUTH_TOKEN_EXPIRE_DAYS

ALGORITHM = "HS256"


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=AUTH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, AUTH_SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, AUTH_SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return {}


def require_auth(f):
    """Flask route decorator — sets g.user_id or returns 401."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401
        token = auth_header[7:]
        payload = verify_token(token)
        if not payload or "sub" not in payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        g.user_id = int(payload["sub"])
        return f(*args, **kwargs)
    return decorated
