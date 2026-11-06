import base64
import hashlib
import json
from pathlib import Path
from typing import Any

from nacl.signing import SigningKey

KEY_PATH = Path("/tmp/ub-ed25519.key")
KEY_ID = "ed25519-2026"


def canonical(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def signing_key() -> SigningKey:
    if KEY_PATH.exists():
        return SigningKey(KEY_PATH.read_bytes())
    key = SigningKey.generate()
    KEY_PATH.write_bytes(bytes(key))
    return key


def public_key_b64() -> str:
    raw = bytes(signing_key().verify_key)
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def sign_payload(payload: dict[str, Any]) -> tuple[bytes, bytes]:
    raw = canonical(payload)
    digest = hashlib.sha256(raw).digest()
    signed = signing_key().sign(raw)
    return digest, signed.signature


def signature_matches(payload: dict[str, Any], signature: bytes) -> bool:
    try:
        signing_key().verify_key.verify(canonical(payload), signature)
    except Exception:
        return False
    return True
