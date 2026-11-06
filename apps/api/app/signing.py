import hashlib
import hmac
import json
from typing import Any

from app.core.config import get_settings


def canonical(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def sign_payload(payload: dict[str, Any]) -> tuple[bytes, bytes]:
    raw = canonical(payload)
    digest = hashlib.sha256(raw).digest()
    signature = hmac.new(get_settings().jwt_secret.encode(), raw, hashlib.sha256).digest()
    return digest, signature


def signature_matches(payload: dict[str, Any], signature: bytes) -> bool:
    _, expected = sign_payload(payload)
    return hmac.compare_digest(expected, signature)
