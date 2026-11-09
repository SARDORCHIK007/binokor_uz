"""Printable certificate on the project's certificate template, signed by QR codes (FR-CERT-PDF).

The page is the 1536x1024 template. Text sits in the template's inner field. The certificate itself
carries a QR to the public verify page; the project leader and each signed partner organisation
"sign" with their own QR: an Ed25519 signature over (certificate number, signer) made with the
platform key, shown as a fingerprint and checkable on the verify page.
"""

import hashlib
import io
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import segno
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.doc_i18n import t
from app.signing import sign_payload

ASSETS = Path(__file__).parent / "assets"
FRAME = ASSETS / "certificate_frame.jpg"
FONTS = ASSETS / "fonts"
W_PX, H_PX = 1536, 1024
PAGE_W = 841.89  # A4 landscape width in pt; height keeps the template proportions
PAGE_H = PAGE_W * H_PX / W_PX
S = PAGE_W / W_PX

NAVY = (7 / 255, 24 / 255, 51 / 255)
BLUE = (31 / 255, 85 / 255, 214 / 255)
GOLD = (176 / 255, 124 / 255, 0)
MUTED = (80 / 255, 92 / 255, 112 / 255)

LEVELS = {"APPRENTICE", "ASSISTANT", "MASTER", "FOREMAN"}
ISSUERS = {"UB_NAMDTU", "UB"}
ROLES = {"GOV", "EDU", "AGENCY"}

_registered = False


def _fonts() -> None:
    global _registered
    if _registered:
        return
    pdfmetrics.registerFont(TTFont("DejaVu", str(FONTS / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONTS / "DejaVuSans-Bold.ttf")))
    _registered = True


@dataclass(frozen=True)
class Signer:
    slug: str
    name: str
    role: str
    signature: str  # full hex Ed25519 signature

    @property
    def fingerprint(self) -> str:
        return " ".join(self.signature[i : i + 4].upper() for i in range(0, 16, 4))


@dataclass(frozen=True)
class CertificateData:
    number: str
    holder: str
    trade: str
    level: str
    issuer: str
    issued_at: date | None
    signature: bytes
    verify_url: str
    signers: tuple[Signer, ...] = field(default_factory=tuple)
    lang: str = "uz-Latn"


def fingerprint(signature: bytes) -> str:
    """Short, human-readable fingerprint of the signature (first 16 hex of SHA-256)."""
    digest = hashlib.sha256(signature).hexdigest()[:16].upper()
    return " ".join(digest[i : i + 4] for i in range(0, 16, 4))


def make_signer(number: str, slug: str, name: str, kind: str, lang: str = "uz-Latn") -> Signer:
    """Deterministic Ed25519 signature over (certificate number, signer) with the platform key."""
    _, signature = sign_payload({"certificate": number, "signer": slug})
    return Signer(slug=slug, name=name, role=t(lang, kind if kind in ROLES else "PARTNER"), signature=signature.hex())


def _qr(url: str) -> ImageReader:
    out = io.BytesIO()
    segno.make(url, error="m").save(out, kind="png", scale=8, border=1, dark="#071833")
    out.seek(0)
    return ImageReader(out)


def _fit(text: str, font: str, size: float, width: float, minimum: float = 7) -> float:
    while size > minimum and pdfmetrics.stringWidth(text, font, size) > width:
        size -= 0.5
    return size


def render(data: CertificateData) -> bytes:
    _fonts()
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(PAGE_W, PAGE_H))
    pdf.setTitle(f"{t(data.lang, 'cert_title')} {data.number}")
    pdf.setAuthor("UYCHI BINOKOR")
    pdf.setSubject(t(data.lang, "cert_title"))
    pdf.drawImage(ImageReader(str(FRAME)), 0, 0, PAGE_W, PAGE_H)

    def pos(x: float, y: float) -> tuple[float, float]:
        return x * S, PAGE_H - y * S

    def centered(text: str, x: float, y: float, font: str, size: float, color: tuple[float, float, float]) -> None:
        pdf.setFillColorRGB(*color)
        pdf.setFont(font, size)
        px, py = pos(x, y)
        pdf.drawCentredString(px, py, text)

    cx = 735  # centre of the inner field, left of the verification QR
    centered("UYCHI BINOKOR", cx, 255, "DejaVu-Bold", 13, NAVY)
    org = t(data.lang, "cert_org")
    centered(org, cx, 275, "DejaVu", _fit(org, "DejaVu", 8.5, 700 * S, 5.5), MUTED)
    title = t(data.lang, "cert_title")
    centered(title, cx, 345, "DejaVu-Bold", _fit(title, "DejaVu-Bold", 30, 700 * S, 14), BLUE)
    sub = t(data.lang, "cert_sub")
    centered(sub, cx, 372, "DejaVu", _fit(sub, "DejaVu", 10.5, 700 * S, 7), MUTED)
    centered(t(data.lang, "cert_certifies"), cx, 425, "DejaVu", 10.5, MUTED)
    name_size = _fit(data.holder, "DejaVu-Bold", 25, 700 * S)
    centered(data.holder, cx, 478, "DejaVu-Bold", name_size, NAVY)
    pdf.setStrokeColorRGB(*GOLD)
    pdf.setLineWidth(1.2)
    x0, y0 = pos(cx - 330, 495)
    x1, _ = pos(cx + 330, 495)
    pdf.line(x0, y0, x1, y0)

    rows = [
        (t(data.lang, "trade"), data.trade),
        (t(data.lang, "level"), t(data.lang, data.level) if data.level in LEVELS else data.level),
        (t(data.lang, "issuer"), t(data.lang, data.issuer) if data.issuer in ISSUERS else data.issuer),
        (t(data.lang, "issued"), data.issued_at.isoformat() if data.issued_at else "—"),
        (t(data.lang, "number"), data.number),
    ]
    y = 535
    label_x, value_x = cx - 60, cx - 30
    for label, value in rows:
        pdf.setFillColorRGB(*MUTED)
        pdf.setFont("DejaVu", 9.5)
        lx, ly = pos(label_x, y)
        pdf.drawRightString(lx, ly, label)
        vx, vy = pos(value_x, y)
        size = _fit(value, "DejaVu-Bold", 11.5, 372 * S)
        pdf.setFillColorRGB(*NAVY)
        pdf.setFont("DejaVu-Bold", size)
        pdf.drawString(vx, vy, value)
        y += 33

    # verification QR (top right of the field)
    qx, qy, qs = 1168, 352, 140
    px, py = pos(qx, qy + qs)
    pdf.drawImage(_qr(data.verify_url), px, py, qs * S, qs * S)
    centered(t(data.lang, "verify"), qx + qs / 2, qy + qs + 16, "DejaVu-Bold", 7, NAVY)

    # signatures: leader first, then partner organisations
    slot = 250
    start = 335
    top = 697
    for index, signer in enumerate(data.signers[:3]):
        sx = start + index * slot
        url = f"{data.verify_url}?signer={signer.slug}&sig={signer.signature[:16]}"
        px, py = pos(sx, top + 70)
        pdf.drawImage(_qr(url), px, py, 70 * S, 70 * S)
        tx = sx + 80
        width = (slot - 92) * S
        pdf.setFillColorRGB(*GOLD)
        pdf.setFont("DejaVu-Bold", _fit(signer.role, "DejaVu-Bold", 7.5, width))
        tpx, tpy = pos(tx, top + 14)
        pdf.drawString(tpx, tpy, signer.role)
        pdf.setFillColorRGB(*NAVY)
        label = signer.name if len(signer.name) <= 34 else signer.name[:33] + "…"
        pdf.setFont("DejaVu-Bold", _fit(label, "DejaVu-Bold", 7.5, width, 5.5))
        npx, npy = pos(tx, top + 30)
        pdf.drawString(npx, npy, label)
        pdf.setFillColorRGB(*MUTED)
        pdf.setFont("DejaVu", 6.5)
        fpx, fpy = pos(tx, top + 46)
        pdf.drawString(fpx, fpy, f"Ed25519 {signer.fingerprint[:9]}")
        pdf.drawString(fpx, fpy - 9, t(data.lang, "signed"))

    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
