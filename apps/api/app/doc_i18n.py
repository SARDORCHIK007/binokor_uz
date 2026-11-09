"""Texts printed on the passport card and the certificate, in the four site languages."""

LANGS = ("uz-Latn", "uz-Cyrl", "ru", "en")
DEFAULT = "uz-Latn"

STR: dict[str, dict[str, str]] = {
    "uz-Latn": {
        "card_title": "TALABA / USTA PASPORTI",
        "scan": "QR orqali tekshiring",
        "group": "Guruh",
        "enrolled": "Qabul",
        "ACTIVE": "O'qiyapti",
        "COMPLETED": "O'qishni tugatgan",
        "SUSPENDED": "To'xtatilgan",
        "DROPPED": "Chiqib ketgan",
        "TRANSFERRED": "Ko'chirilgan",
        "cert_org": "Uychi tumani hokimligi loyihasi · Kasbiy malaka platformasi",
        "cert_title": "MALAKA SERTIFIKATI",
        "cert_sub": "Kasbiy malaka tasdig'i",
        "cert_certifies": "Ushbu sertifikat egasi",
        "trade": "Kasb",
        "level": "Daraja",
        "issuer": "Beruvchi",
        "issued": "Berilgan sana",
        "number": "Raqam",
        "verify": "QR orqali tekshiring",
        "signed": "raqamli imzo",
        "APPRENTICE": "Shogird",
        "ASSISTANT": "Yordamchi usta",
        "MASTER": "Usta",
        "FOREMAN": "Brigadir",
        "UB_NAMDTU": "UYCHI BINOKOR va Namangan davlat texnika universiteti",
        "UB": "UYCHI BINOKOR o'quv markazi",
        "GOV": "Loyiha rahbari",
        "EDU": "Ta'lim hamkori",
        "AGENCY": "Agentlik hamkori",
        "PARTNER": "Hamkor",
    },
    "uz-Cyrl": {
        "card_title": "ТАЛАБА / УСТА ПАСПОРТИ",
        "scan": "QR орқали текширинг",
        "group": "Гуруҳ",
        "enrolled": "Қабул",
        "ACTIVE": "Ўқияпти",
        "COMPLETED": "Ўқишни тугатган",
        "SUSPENDED": "Тўхтатилган",
        "DROPPED": "Чиқиб кетган",
        "TRANSFERRED": "Кўчирилган",
        "cert_org": "Уйчи тумани ҳокимлиги лойиҳаси · Касбий малака платформаси",
        "cert_title": "МАЛАКА СЕРТИФИКАТИ",
        "cert_sub": "Касбий малака тасдиғи",
        "cert_certifies": "Ушбу сертификат эгаси",
        "trade": "Касб",
        "level": "Даража",
        "issuer": "Берувчи",
        "issued": "Берилган сана",
        "number": "Рақам",
        "verify": "QR орқали текширинг",
        "signed": "рақамли имзо",
        "APPRENTICE": "Шогирд",
        "ASSISTANT": "Ёрдамчи уста",
        "MASTER": "Уста",
        "FOREMAN": "Бригадир",
        "UB_NAMDTU": "UYCHI BINOKOR ва Наманган давлат техника университети",
        "UB": "UYCHI BINOKOR ўқув маркази",
        "GOV": "Лойиҳа раҳбари",
        "EDU": "Таълим ҳамкори",
        "AGENCY": "Агентлик ҳамкори",
        "PARTNER": "Ҳамкор",
    },
    "ru": {
        "card_title": "ПАСПОРТ СТУДЕНТА / МАСТЕРА",
        "scan": "Проверьте по QR",
        "group": "Группа",
        "enrolled": "Зачислен",
        "ACTIVE": "Учится",
        "COMPLETED": "Окончил обучение",
        "SUSPENDED": "Приостановлено",
        "DROPPED": "Отчислен",
        "TRANSFERRED": "Переведён",
        "cert_org": "Проект хокимията Уйчинского района · Платформа профессиональной квалификации",
        "cert_title": "СЕРТИФИКАТ КВАЛИФИКАЦИИ",
        "cert_sub": "Подтверждение профессиональной квалификации",
        "cert_certifies": "Настоящий сертификат выдан",
        "trade": "Профессия",
        "level": "Уровень",
        "issuer": "Выдан",
        "issued": "Дата выдачи",
        "number": "Номер",
        "verify": "Проверьте по QR",
        "signed": "цифровая подпись",
        "APPRENTICE": "Ученик",
        "ASSISTANT": "Помощник мастера",
        "MASTER": "Мастер",
        "FOREMAN": "Бригадир",
        "UB_NAMDTU": "UYCHI BINOKOR и Наманганский государственный технический университет",
        "UB": "Учебный центр UYCHI BINOKOR",
        "GOV": "Руководитель проекта",
        "EDU": "Партнёр по образованию",
        "AGENCY": "Партнёр-агентство",
        "PARTNER": "Партнёр",
    },
    "en": {
        "card_title": "STUDENT / WORKER PASSPORT",
        "scan": "Scan to verify",
        "group": "Group",
        "enrolled": "Enrolled",
        "ACTIVE": "Studying",
        "COMPLETED": "Completed",
        "SUSPENDED": "Suspended",
        "DROPPED": "Dropped",
        "TRANSFERRED": "Transferred",
        "cert_org": "Uychi District Administration project · Professional qualification platform",
        "cert_title": "CERTIFICATE OF QUALIFICATION",
        "cert_sub": "Professional qualification confirmation",
        "cert_certifies": "This certifies that",
        "trade": "Trade",
        "level": "Level",
        "issuer": "Issued by",
        "issued": "Issued on",
        "number": "Number",
        "verify": "Scan to verify",
        "signed": "digital signature",
        "APPRENTICE": "Apprentice",
        "ASSISTANT": "Assistant",
        "MASTER": "Master",
        "FOREMAN": "Foreman",
        "UB_NAMDTU": "UYCHI BINOKOR and Namangan State Technical University",
        "UB": "UYCHI BINOKOR training centre",
        "GOV": "Project leader",
        "EDU": "Education partner",
        "AGENCY": "Agency partner",
        "PARTNER": "Partner",
    },
}


def lang_of(value: str | None) -> str:
    """Normalise any locale string to one of the four supported languages."""
    if value in STR:
        return str(value)
    short = (value or "").split("-")[0].lower()
    return {"ru": "ru", "en": "en", "de": "en", "ar": "en", "uz": "uz-Latn"}.get(short, DEFAULT)


def t(lang: str, key: str) -> str:
    return STR.get(lang, STR[DEFAULT]).get(key) or STR[DEFAULT].get(key, key)


def pick(value: object, lang: str) -> str:
    """Pick a language from a translatable jsonb value, falling back to uz-Latn then anything."""
    if isinstance(value, dict):
        return str(value.get(lang) or value.get(DEFAULT) or next(iter(value.values()), ""))
    return ""
