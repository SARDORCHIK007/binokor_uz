import hashlib
import hmac
import secrets
import time


def new_secret() -> bytes:
    return secrets.token_bytes(20)


def current_code(secret: bytes, step: int = 30, drift: int = 0) -> str:
    counter = int(time.time()) // step + drift
    digest = hmac.new(secret, counter.to_bytes(8, "big"), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = int.from_bytes(digest[offset : offset + 4], "big") & 0x7FFFFFFF
    return f"{binary % 1_000_000:06d}"


def code_matches(secret: bytes, code: str) -> bool:
    return any(hmac.compare_digest(current_code(secret, drift=shift), code) for shift in (-1, 0, 1))


def backup_codes() -> list[str]:
    return [f"{secrets.randbelow(1_000_000):06d}" for _ in range(10)]
