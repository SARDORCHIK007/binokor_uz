import base64
import hashlib
import json
import os
import shutil
from pathlib import Path
from typing import Any

from nacl.signing import SigningKey

# The private key must survive container re-creation, otherwise every issued certificate
# stops verifying. It lives in the host-mounted data directory (git-ignored), not in /tmp.
KEY_PATH = Path(os.environ.get("SIGNING_KEY_PATH", "/app/data/keys/ub-ed25519.key"))
LEGACY_KEY_PATH = Path("/tmp/ub-ed25519.key")
KEY_ID = "ed25519-2026"


def canonical(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def signing_key() -> SigningKey:
    if not KEY_PATH.exists():
        KEY_PATH.parent.mkdir(parents=True, exist_ok=True)
        if LEGACY_KEY_PATH.exists():  # one-time move of the old location
            shutil.copy2(LEGACY_KEY_PATH, KEY_PATH)
        else:
            KEY_PATH.write_bytes(bytes(SigningKey.generate()))
        KEY_PATH.chmod(0o600)
    return SigningKey(KEY_PATH.read_bytes())


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
