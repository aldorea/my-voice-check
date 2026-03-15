import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

security = HTTPBearer()


# ==================== PASSWORD HASHING ====================

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}${hashed}"


def verify_password(plain: str, stored: str) -> bool:
    salt, hashed = stored.split("$", 1)
    return hmac.compare_digest(
        hashlib.sha256(f"{salt}{plain}".encode()).hexdigest(), hashed
    )


# ==================== JWT (manual HS256) ====================

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * padding)


def create_access_token(user_id: int) -> str:
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload_data = {"sub": str(user_id), "exp": int(expire.timestamp())}
    payload = _b64url_encode(json.dumps(payload_data).encode())
    signature = hmac.new(
        settings.SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256
    ).digest()
    sig = _b64url_encode(signature)
    return f"{header}.{payload}.{sig}"


def _decode_token(token: str) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token")

    header_b64, payload_b64, sig_b64 = parts
    expected_sig = hmac.new(
        settings.SECRET_KEY.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256,
    ).digest()

    if not hmac.compare_digest(_b64url_decode(sig_b64), expected_sig):
        raise ValueError("Invalid signature")

    payload = json.loads(_b64url_decode(payload_b64))

    if "exp" in payload and datetime.now(timezone.utc).timestamp() > payload["exp"]:
        raise ValueError("Token expired")

    return payload


# ==================== DEPENDENCY ====================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = _decode_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user
