from app.health import overall


def test_overall_ok() -> None:
    status, code = overall({"db": "ok", "redis": "ok", "minio": "ok"})
    assert status == "ok"
    assert code == 200


def test_overall_degraded() -> None:
    status, code = overall({"db": "error", "redis": "ok", "minio": "ok"})
    assert status == "degraded"
    assert code == 503
