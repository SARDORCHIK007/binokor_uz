"""NFR-SEC: rate limits trust only the nginx-added client IP."""

from app.ratelimit import client_ip
from starlette.requests import Request


def _request(headers: dict[str, str], host: str = "172.18.0.9") -> Request:
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (host, 1234),
    }
    return Request(scope)


def test_uses_last_forwarded_address_added_by_nginx() -> None:
    spoofed = _request({"X-Forwarded-For": "1.2.3.4, 198.51.100.7"})
    assert client_ip(spoofed) == "198.51.100.7"


def test_falls_back_to_socket_address() -> None:
    assert client_ip(_request({})) == "172.18.0.9"
