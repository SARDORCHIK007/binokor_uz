"""Student / worker passport card rendered on the project's card template (FR-PASSPORT).

The template is a 1536x1024 PNG with a photo frame (left), four text lines (middle) and a QR frame
(right). The card is for people who were accepted to study; it carries the essentials and a QR code
that opens the public check page. Layout constants are measured on that template.
"""

import hashlib
import io
from dataclasses import dataclass
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont, ImageOps

from app.doc_i18n import t

ASSETS = Path(__file__).parent / "assets"
TEMPLATE = ASSETS / "passport_card.png"
FONT = ASSETS / "fonts" / "DejaVuSans.ttf"
FONT_BOLD = ASSETS / "fonts" / "DejaVuSans-Bold.ttf"

PHOTO_BOX = (122, 200, 582, 770)  # x0, y0, x1, y1
QR_BOX = (1124, 460, 1418, 794)
LINES = [  # (text baseline y, x start, x end)
    (362, 653, 1112),
    (463, 653, 1042),
    (540, 653, 1042),
    (616, 653, 983),
]
GOLD = (245, 180, 0)
WHITE = (255, 255, 255)
SOFT = (200, 214, 240)
NAVY = (7, 24, 51)


@dataclass(frozen=True)
class PassportData:
    number: str
    name: str
    trade: str  # already in the card language
    group_code: str
    status_code: str  # ACTIVE, COMPLETED, ...
    enrolled_on: str  # ISO date
    fingerprint: str
    verify_url: str


def fingerprint_of(signature: bytes) -> str:
    """Short fingerprint of the Ed25519 signature printed on the card."""
    digest = hashlib.sha256(signature).hexdigest()[:16].upper()
    return " ".join(digest[i : i + 4] for i in range(0, 16, 4))


def _font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def _fit(draw: ImageDraw.ImageDraw, text: str, path: Path, size: int, width: int, minimum: int = 16) -> ImageFont.FreeTypeFont:
    font = _font(path, size)
    while size > minimum and draw.textlength(text, font=font) > width:
        size -= 1
        font = _font(path, size)
    return font


def _silhouette(size: tuple[int, int]) -> Image.Image:
    """Neutral avatar used until a real photo is uploaded."""
    w, h = size
    img = Image.new("RGB", size, (232, 238, 248))
    d = ImageDraw.Draw(img)
    d.ellipse((w * 0.33, h * 0.18, w * 0.67, h * 0.18 + w * 0.34), fill=(150, 168, 200))
    d.ellipse((w * 0.14, h * 0.58, w * 0.86, h * 1.35), fill=(150, 168, 200))
    return img


def render_card(data: PassportData, photo: bytes | None = None, lang: str = "uz-Latn") -> bytes:
    card = Image.open(TEMPLATE).convert("RGBA")
    draw = ImageDraw.Draw(card)

    # photo
    x0, y0, x1, y1 = PHOTO_BOX
    size = (x1 - x0, y1 - y0)
    if photo:
        try:
            face = ImageOps.fit(Image.open(io.BytesIO(photo)).convert("RGB"), size, Image.Resampling.LANCZOS, centering=(0.5, 0.35))
        except OSError:
            face = _silhouette(size)
    else:
        face = _silhouette(size)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=34, fill=255)
    card.paste(face, (x0, y0), mask)

    # QR
    qx0, qy0, qx1, qy1 = QR_BOX
    qr_png = io.BytesIO()
    segno.make(data.verify_url, error="m").save(qr_png, kind="png", scale=10, border=1, dark="#071833")
    qr = Image.open(qr_png).convert("RGB")
    side = min(qx1 - qx0 - 24, qy1 - qy0 - 70)
    qr = qr.resize((side, side), Image.Resampling.NEAREST)
    card.paste(qr, (qx0 + (qx1 - qx0 - side) // 2, qy0 + 14))
    cap = _font(FONT_BOLD, 21)
    label = t(lang, "scan")
    draw.text((qx0 + (qx1 - qx0 - draw.textlength(label, font=cap)) / 2, qy1 - 42), label, font=cap, fill=NAVY)

    # header
    draw.text((660, 150), "UYCHI BINOKOR", font=_font(FONT_BOLD, 40), fill=GOLD)
    draw.text((660, 200), t(lang, "card_title"), font=_fit(draw, t(lang, "card_title"), FONT, 24, 335, 15), fill=SOFT)

    # four text lines (written just above each rule)
    rows = [
        (data.name, FONT_BOLD, 46, WHITE),
        (data.trade, FONT_BOLD, 32, GOLD),
        (f"{t(lang, 'group')} {data.group_code}", FONT, 28, WHITE),
        (f"{t(lang, data.status_code)} · {t(lang, 'enrolled')}: {data.enrolled_on}", FONT, 26, SOFT),
    ]
    for (base_y, xs, xe), (text, path, font_size, color) in zip(LINES, rows, strict=True):
        font = _fit(draw, text, path, font_size, xe - xs)
        height = font.getbbox("Ag")[3]
        draw.text((xs, base_y - height - 10), text, font=font, fill=color)

    # footer inside the dotted area
    draw.text((653, 722), data.number, font=_fit(draw, data.number, FONT_BOLD, 34, 420), fill=GOLD)
    draw.text((653, 768), f"Ed25519 · {data.fingerprint}", font=_font(FONT, 20), fill=SOFT)

    out = io.BytesIO()
    card.save(out, "PNG", optimize=True)
    return out.getvalue()


def card_pdf(png: bytes) -> bytes:
    """Printable PDF: the card at ISO ID-1 proportions on an A6 landscape page."""
    from reportlab.lib.units import mm  # noqa: PLC0415
    from reportlab.lib.utils import ImageReader  # noqa: PLC0415
    from reportlab.pdfgen import canvas  # noqa: PLC0415

    width, height = 148 * mm, 105 * mm
    out = io.BytesIO()
    pdf = canvas.Canvas(out, pagesize=(width, height))
    pdf.setTitle("UYCHI BINOKOR pasporti")
    margin = 6 * mm
    card_w = width - 2 * margin
    card_h = card_w * 1024 / 1536
    pdf.drawImage(ImageReader(io.BytesIO(png)), margin, (height - card_h) / 2, card_w, card_h, mask="auto")
    pdf.showPage()
    pdf.save()
    return out.getvalue()
