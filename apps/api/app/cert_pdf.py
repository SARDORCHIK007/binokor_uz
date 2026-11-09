"""Printable certificate PDF with QR verification code (FR-CERT-PDF).

A4 landscape, brand colors, DejaVu font (covers Uzbek Latin and Cyrillic), QR code that
opens the public verify page, and a short fingerprint of the Ed25519 signature so a paper
copy can be checked against the registry.
"""

import hashlib
import io
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import segno
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

FONTS = Path(__file__).parent / "assets" / "fonts"
NAVY = (7 / 255, 24 / 255, 51 / 255)
BLUE = (47 / 255, 107 / 255, 255 / 255)
YELLOW = (245 / 255, 180 / 255, 0)
MUTED = (95 / 255, 107 / 255, 125 / 255)

LEVELS = {
    "APPRENTICE": "Shogird / Apprentice",
    "ASSISTANT": "Yordamchi usta / Assistant",
    "MASTER": "Usta / Master",
    "FOREMAN": "Brigadir / Foreman",
}
ISSUERS = {
    "UB_NAMDTU": "UYCHI BINOKOR va Namangan davlat texnika universiteti",
    "UB": "UYCHI BINOKOR o'quv markazi",
}

_registered = False


def _fonts() -> None:
    global _registered
    if _registered:
        return
    pdfmetrics.registerFont(TTFont("DejaVu", str(FONTS / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONTS / "DejaVuSans-Bold.ttf")))
    _registered = True


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


def fingerprint(signature: bytes) -> str:
    """Short, human-readable fingerprint of the signature (first 16 hex of SHA-256)."""
    digest = hashlib.sha256(signature).hexdigest()[:16].upper()
    return " ".join(digest[i : i + 4] for i in range(0, 16, 4))


def render(data: CertificateData) -> bytes:
    _fonts()
    buffer = io.BytesIO()
    width, height = landscape(A4)
    pdf = canvas.Canvas(buffer, pagesize=(width, height))
    pdf.setTitle(f"Sertifikat {data.number}")
    pdf.setAuthor("UYCHI BINOKOR")
    pdf.setSubject("Malaka sertifikati")

    # Frame: navy outer, yellow inner line.
    pdf.setFillColorRGB(1, 1, 1)
    pdf.rect(0, 0, width, height, stroke=0, fill=1)
    pdf.setStrokeColorRGB(*NAVY)
    pdf.setLineWidth(6)
    pdf.rect(12 * mm, 12 * mm, width - 24 * mm, height - 24 * mm)
    pdf.setStrokeColorRGB(*YELLOW)
    pdf.setLineWidth(1.5)
    pdf.rect(16 * mm, 16 * mm, width - 32 * mm, height - 32 * mm)

    # Header band with the house mark.
    top = height - 34 * mm
    pdf.setFillColorRGB(*YELLOW)
    path = pdf.beginPath()
    path.moveTo(28 * mm, top)
    path.lineTo(36 * mm, top + 8 * mm)
    path.lineTo(44 * mm, top)
    path.close()
    pdf.drawPath(path, stroke=0, fill=1)
    pdf.setFillColorRGB(*NAVY)
    pdf.rect(31 * mm, top - 7 * mm, 10 * mm, 7 * mm, stroke=0, fill=1)
    pdf.setFont("DejaVu-Bold", 18)
    pdf.drawString(48 * mm, top - 3 * mm, "UYCHI BINOKOR")
    pdf.setFont("DejaVu", 9)
    pdf.setFillColorRGB(*MUTED)
    tagline = "Uychi tumani hokimligi loyihasi · Kasbiy malaka platformasi"
    pdf.drawString(48 * mm, top - 8 * mm, tagline)

    # Layout: QR panel on the right, text column centred in the remaining space.
    qr_size = 52 * mm
    qr_x = width - 32 * mm - qr_size
    cx = 28 * mm + (qr_x - 12 * mm - 28 * mm) / 2
    value_x = 28 * mm + 50 * mm
    value_max = qr_x - 8 * mm - value_x

    # Title.
    pdf.setFillColorRGB(*BLUE)
    pdf.setFont("DejaVu-Bold", 30)
    pdf.drawCentredString(cx, height - 70 * mm, "MALAKA SERTIFIKATI")
    pdf.setFillColorRGB(*MUTED)
    pdf.setFont("DejaVu", 11)
    pdf.drawCentredString(cx, height - 78 * mm, "Certificate of qualification")

    # Holder and details.
    pdf.setFillColorRGB(*MUTED)
    pdf.setFont("DejaVu", 11)
    intro = "Ushbu sertifikat egasi / This certifies that"
    pdf.drawCentredString(cx, height - 94 * mm, intro)
    pdf.setFillColorRGB(*NAVY)
    pdf.setFont("DejaVu-Bold", 26)
    pdf.drawCentredString(cx, height - 108 * mm, data.holder)
    pdf.setStrokeColorRGB(*YELLOW)
    pdf.setLineWidth(1)
    pdf.line(cx - 70 * mm, height - 112 * mm, cx + 70 * mm, height - 112 * mm)

    rows = [
        ("Kasb / Trade", data.trade),
        ("Daraja / Level", LEVELS.get(data.level, data.level)),
        ("Beruvchi / Issuer", ISSUERS.get(data.issuer, data.issuer)),
        ("Berilgan sana / Issued", data.issued_at.isoformat() if data.issued_at else "—"),
        ("Raqam / Number", data.number),
    ]
    y = height - 126 * mm
    for label, value in rows:
        pdf.setFillColorRGB(*MUTED)
        pdf.setFont("DejaVu", 10)
        pdf.drawRightString(value_x - 5 * mm, y, label)
        pdf.setFillColorRGB(*NAVY)
        size = 12.0
        while size > 7 and pdfmetrics.stringWidth(value, "DejaVu-Bold", size) > value_max:
            size -= 0.5
        pdf.setFont("DejaVu-Bold", size)
        pdf.drawString(value_x, y, value)
        y -= 8.5 * mm

    # QR panel on the right.
    qr = segno.make(data.verify_url, error="m")
    png = io.BytesIO()
    qr.save(png, kind="png", scale=8, border=2, dark="#071833")
    png.seek(0)
    qr_y = height / 2 - qr_size / 2 - 6 * mm
    pdf.drawImage(ImageReader(png), qr_x, qr_y, qr_size, qr_size)
    pdf.setFillColorRGB(*NAVY)
    pdf.setFont("DejaVu-Bold", 9)
    pdf.drawCentredString(qr_x + qr_size / 2, qr_y - 6 * mm, "QR orqali tekshiring")
    pdf.setFillColorRGB(*MUTED)
    pdf.setFont("DejaVu", 7.5)
    pdf.drawCentredString(qr_x + qr_size / 2, qr_y - 10.5 * mm, data.verify_url)

    # Footer: signature fingerprint and note.
    pdf.setFillColorRGB(*MUTED)
    pdf.setFont("DejaVu", 8.5)
    pdf.drawString(
        28 * mm,
        26 * mm,
        f"Raqamli imzo (Ed25519) izi: {fingerprint(data.signature)}",
    )
    pdf.drawString(
        28 * mm,
        21 * mm,
        "Haqiqiyligini QR yoki raqam orqali uychibinokor.uz/verify sahifasida tekshiring. "
        "Bekor qilingan sertifikat ham reyestrda ko'rinadi.",
    )
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()
