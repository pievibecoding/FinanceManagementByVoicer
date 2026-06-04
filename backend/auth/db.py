"""User database operations."""
from typing import Optional

from database import get_db


def find_user_by_email(email: str) -> Optional[dict]:
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM users WHERE email = ? AND is_deleted = 0",
            [email.strip().lower()],
        )
        if not result.rows:
            return None
        cols = result.columns
        return dict(zip(cols, result.rows[0]))
    finally:
        db.close()


def find_user_by_google_sub(google_sub: str) -> Optional[dict]:
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM users WHERE google_sub = ? AND is_deleted = 0",
            [google_sub],
        )
        if not result.rows:
            return None
        cols = result.columns
        return dict(zip(cols, result.rows[0]))
    finally:
        db.close()


def find_user_by_id(user_id: int) -> Optional[dict]:
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM users WHERE user_id = ? AND is_deleted = 0",
            [user_id],
        )
        if not result.rows:
            return None
        cols = result.columns
        return dict(zip(cols, result.rows[0]))
    finally:
        db.close()


def create_user(email: Optional[str], username: Optional[str],
                password_hash: Optional[str], google_sub: Optional[str]) -> int:
    """Insert a new user and return the new user_id."""
    db = get_db()
    try:
        db.execute(
            "INSERT INTO users (email, username, password_hash, google_sub) VALUES (?, ?, ?, ?)",
            [email, username, password_hash, google_sub],
        )
        result = db.execute("SELECT last_insert_rowid()")
        return int(result.rows[0][0])
    finally:
        db.close()


def update_google_sub(user_id: int, google_sub: str) -> None:
    db = get_db()
    try:
        db.execute(
            "UPDATE users SET google_sub = ? WHERE user_id = ?",
            [google_sub, user_id],
        )
    finally:
        db.close()
