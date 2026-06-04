"""Auth business logic: register, login, google_auth."""
import re
from typing import Optional

from config import GOOGLE_CLIENT_ID
from database import get_db, seed_categories_for_user
from auth.db import (
    find_user_by_email, find_user_by_google_sub,
    create_user, update_google_sub,
)
from auth.jwt_utils import create_token
from auth.password_hasher import hash_password, verify_password

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validate_email(email: str) -> None:
    if not _EMAIL_RE.match(email):
        raise ValueError("Invalid email format")


def register(email: str, username: str, password: str) -> dict:
    email = email.strip().lower()
    username = username.strip()

    _validate_email(email)
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not password.strip():
        raise ValueError("Password cannot be whitespace only")

    if find_user_by_email(email):
        raise ValueError("Email already registered")

    hashed = hash_password(password)
    user_id = create_user(email=email, username=username,
                          password_hash=hashed, google_sub=None)

    # Seed default categories for this new user
    db = get_db()
    try:
        seed_categories_for_user(db, user_id)
    finally:
        db.close()

    token = create_token(user_id)
    return {"access_token": token, "token_type": "bearer", "user_id": user_id}


def login(email: str, password: str) -> dict:
    email = email.strip().lower()
    user = find_user_by_email(email)
    if not user or not user.get("password_hash"):
        raise ValueError("Invalid credentials")
    if not verify_password(password, user["password_hash"]):
        raise ValueError("Invalid credentials")

    token = create_token(user["user_id"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["user_id"],
        "email": user.get("email"),
        "username": user.get("username"),
    }


def google_auth(id_token: str) -> dict:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    try:
        id_info = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None,
        )
    except Exception:
        raise ValueError("Google authentication failed")

    google_sub: str = id_info.get("sub", "")
    email: Optional[str] = (id_info.get("email") or "").strip().lower() or None
    name: Optional[str] = (id_info.get("name") or "").strip() or None

    # 1. Existing google_sub → login
    user = find_user_by_google_sub(google_sub)
    if user:
        token = create_token(user["user_id"])
        return {"access_token": token, "token_type": "bearer",
                "user_id": user["user_id"], "email": user.get("email"), "name": name}

    # 2. Existing email → link google_sub
    if email:
        user = find_user_by_email(email)
        if user:
            update_google_sub(user["user_id"], google_sub)
            token = create_token(user["user_id"])
            return {"access_token": token, "token_type": "bearer",
                    "user_id": user["user_id"], "email": email, "name": name}

    # 3. New user → create account
    username = name or (email.split("@")[0] if email else "user")
    user_id = create_user(email=email, username=username,
                          password_hash=None, google_sub=google_sub)

    db = get_db()
    try:
        seed_categories_for_user(db, user_id)
    finally:
        db.close()

    token = create_token(user_id)
    return {"access_token": token, "token_type": "bearer",
            "user_id": user_id, "email": email, "name": name}
