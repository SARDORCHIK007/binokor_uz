from app.routers.auth import OtpRequest, OtpVerify


def test_phone_accepts_local_nine_digits() -> None:
    body = OtpRequest(phone="901000001")
    assert body.phone == "+998901000001"


def test_code_must_be_six_digits() -> None:
    body = OtpVerify(phone="+998901000001", code="123456")
    assert body.code == "123456"
