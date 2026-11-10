import re

PHONE = re.compile(r"\+998[0-9]{9}")
PINFL = re.compile(r"\b[0-9]{14}\b")
PRIVILEGED_ROLES = {"superadmin", "admin", "education_lead", "cert_officer", "placement_manager"}


def matrix_class(experience_years: float, has_language: bool) -> str:
    if experience_years > 0 and has_language:
        return "D"
    if experience_years > 0:
        return "A"
    if has_language:
        return "B"
    return "C"


def language_module_allowed(track: str, kind: str) -> bool:
    return not (track == "DOMESTIC" and kind == "LANGUAGE")


def course_duration_ok(track: str, days: int, *, accelerated: bool = False) -> bool:
    """6-12 months; only an accelerated course (trade and language already held) is about 3."""
    if track not in {"DOMESTIC", "FOREIGN"}:
        return False
    if accelerated:
        return 80 <= days <= 100
    return 170 <= days <= 380


def cert_blockers(
    *,
    attendance: float,
    modules_passed: bool,
    theory: float | None,
    practice: float | None,
    site_hours: float,
    site_norm: float,
) -> list[str]:
    blocked: list[str] = []
    if attendance < 0.8:
        blocked.append("attendance")
    if not modules_passed:
        blocked.append("modules")
    if theory is None or theory < 60:
        blocked.append("theory")
    if practice is None or practice < 70:
        blocked.append("practice")
    if site_hours < site_norm:
        blocked.append("site_hours")
    return blocked


def show_logo(status: str, logo_permission: bool) -> bool:
    return status == "SIGNED" and logo_permission


def request_status(track: str, agency_id: object | None) -> str:
    if track == "FOREIGN" and agency_id is not None:
        return "VIA_AGENCY"
    return "NEW"


def foreign_can_advance(track: str, status: str, agency_id: object | None) -> bool:
    if track != "FOREIGN":
        return True
    if status in {"NEW", "CANCELLED"}:
        return agency_id is not None or status == "CANCELLED"
    return agency_id is not None


def brigade_ready(members: list[dict[str, object]]) -> bool:
    if not 8 <= len(members) <= 10:
        return False
    for member in members:
        certified = bool(member.get("certified"))
        raw_vocab = member.get("vocab_ratio") or 0
        vocab = float(raw_vocab) if isinstance(raw_vocab, (int, float, str)) else 0.0
        medical = bool(member.get("medical"))
        if not certified or vocab < 0.8 or not medical:
            return False
    return True


def leitner_days(box: int) -> int:
    clamped = min(5, max(1, box))
    return int(2 ** (clamped - 1))


def curator_below_minimum(member_count: int) -> bool:
    return member_count < 8


def public_stats(counts: dict[str, int]) -> dict[str, int]:
    return {key: value for key, value in counts.items() if value > 0}


def redact(message: str) -> str:
    cleaned = PHONE.sub("+998•••••••••", message)
    return PINFL.sub("••••••••••••••", cleaned)


def sanitize_for_model(payload: dict[str, object]) -> dict[str, object]:
    hidden = {"name", "full_name", "phone", "pinfl", "first_name", "last_name"}
    return {key: value for key, value in payload.items() if key not in hidden}
