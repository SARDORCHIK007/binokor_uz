# 05. API shartnomasi (REST, `/api/v1`)

To'liq mashina o'qiydigan shartnoma — FastAPI avtomatik yaratadigan **OpenAPI 3.1** (`/api/v1/openapi.json`). Bu hujjat uning qoidalari va endpointlar ro'yxatini belgilaydi. Kod va bu hujjat bir-biriga zid bo'lmasligi kerak, CI shuni tekshiradi (`schemathesis`).

## 1. Umumiy qoidalar

| Qoida | Qiymat |
|---|---|
| Format | JSON, UTF-8. Maydonlar nomi `snake_case` |
| Vaqt | ISO 8601 UTC (`2026-12-01T09:00:00Z`). Sana `YYYY-MM-DD` |
| Pul | `{"amount": "5000000.00", "currency": "UZS"}` ko'rinishida, `amount` string |
| ID | UUID v7 |
| Til | `Accept-Language` sarlavhasi: `uz-Latn`, `uz-Cyrl`, `ru`, `en`, `de`, `ar`. Javobda tarjima qilinadigan maydonlar shu tilda qaytadi |
| Autentifikatsiya | `Authorization: Bearer <access_jwt>` (15 daqiqa) + `refresh` httpOnly cookie (30 kun, rotatsiyali). Brauzerda access token xotirada saqlanadi, `localStorage`ga yozilmaydi |
| CSRF | Cookie bilan ishlaydigan endpointlar (`/auth/refresh`, `/auth/logout`) `X-CSRF-Token` (double-submit) talab qiladi |
| Idempotentlik | Barcha `POST`/`PATCH` so'rovlari `Idempotency-Key` sarlavhasini qabul qiladi. Javob 24 soat keshlanadi. Oflayn sinxronlash uchun bu sarlavha majburiy |
| Versiya | URL'da `/v1`. Mos kelmaydigan o'zgarish faqat `/v2` da kiritiladi |
| Pagination | Kursor bo'yicha: `?limit=20&cursor=...` → `{"items": [...], "next_cursor": "...", "total": 123}`. `total` faqat `?with_total=true` bo'lsa qaytadi |
| Filtr va saralash | `?status=ACTIVE&trade=plumber&sort=-created_at` |
| Rate limit | Javobda `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` sarlavhalari bor. Limit oshsa `429` + `Retry-After` |
| Kuzatuv | Har bir javobda `X-Request-Id` sarlavhasi bor |
| Ochiq endpointlar | `/public/*` autentifikatsiyasiz ishlaydi, faqat ruxsat etilgan maydonlarni qaytaradi va keshlanadi |
| Jonlilik | `GET /health` versiyasiz. Autentifikatsiya yo'q. DB, Redis va MinIO holati |

## 2. Xato formati (RFC 9457 Problem Details)

```json
{
  "type": "https://uychibinokor.uz/errors/group-full",
  "title": "Guruh to'lgan",
  "status": 409,
  "code": "GROUP_FULL",
  "detail": "Bu guruhda 10 ta tinglovchi bor. Bir ustozga ko'pi bilan 10 ta tinglovchi biriktiriladi.",
  "instance": "/api/v1/enrollments",
  "request_id": "01JC...",
  "errors": [{"field": "group_id", "code": "GROUP_FULL", "message": "..."}]
}
```

| HTTP | Qachon |
|---|---|
| 400 | Noto'g'ri format |
| 401 | Token yo'q yoki muddati o'tgan |
| 403 | Ruxsat yo'q |
| 404 | Topilmadi (ruxsat yo'q obyektlar uchun ham 404 qaytadi: mavjudligi oshkor qilinmaydi) |
| 409 | Biznes qoidasi buzildi |
| 422 | Validatsiya xatosi |
| 429 | So'rovlar ko'p |
| 5xx | Server xatosi (ichki tafsilotlar qaytarilmaydi) |

**Biznes xato kodlari:**
- `GROUP_FULL`, `MENTOR_FULL`, `CURATOR_GROUP_FULL`, `TRACK_LANGUAGE_FORBIDDEN`
- `CERT_RULES_NOT_MET`, `CERT_SAME_APPROVER`, `CERT_ALREADY_ISSUED`
- `BRIGADE_SIZE_INVALID`, `BRIGADE_NOT_READY`
- `FOREIGN_REQUIRES_AGENCY`, `EMPLOYER_NOT_VERIFIED`
- `CONSENT_REQUIRED`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_TOO_MANY`
- `FILE_TYPE_NOT_ALLOWED`, `FILE_INFECTED`, `LOGO_PERMISSION_MISSING`

## 3. Endpointlar

### 3.0. Jonlilik
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET 🌐 | `/health` | `{status: "ok"\|"degraded", checks: {db, redis, minio}}`. Har bir tekshiruv `"ok"` yoki `"error"`. Hammasi `ok` bo'lsa HTTP 200, aks holda 503. Shaxsiy ma'lumot qaytmaydi |



Belgilar: 🌐 ochiq, 🔐 kirish talab qilinadi. Rollar `06_SECURITY.md` 4-bo'limdagi matritsa bo'yicha.

### 3.1. Autentifikatsiya
| Metod | Yo'l | Tavsif |
|---|---|---|
| POST 🌐 | `/auth/otp/request` | `{phone, channel?: "telegram"\|"sms", captcha_token?}`. `channel` faqat afzallik. Kanalni server tanlaydi: standart — Telegram. SMS faqat foydalanuvchida bog'langan Telegram bo'lmasa yoki Telegram yetkazilmasa, va faqat captcha bilan. Kod 6 xonali, 5 daqiqa amal qiladi, 5 marta kiritishga ruxsat. Limit: 3 so'rov / 10 daqiqa / raqam |
| POST 🌐 | `/auth/otp/verify` | `{phone, code}` → `{access_token, user, requires_2fa}` + refresh cookie |
| POST 🔐 | `/auth/2fa/verify` | `{totp}`. Admin rollari uchun majburiy |
| POST 🔐 | `/auth/2fa/setup` | QR va zaxira kodlar |
| POST | `/auth/refresh` | Refresh rotatsiyasi. Eski token qayta ishlatilsa, hamma sessiyalar bekor qilinadi |
| POST 🔐 | `/auth/logout` | Joriy sessiyani tugatish |
| GET 🔐 | `/me` | Profil, rollar, ruxsatlar ro'yxati |
| GET/DELETE 🔐 | `/me/sessions` | Faol sessiyalarni ko'rish va bekor qilish |
| GET/PUT 🔐 | `/me/consents` | Roziliklar |
| GET 🔐 | `/me/data-export` | Shaxsiy ma'lumotlar nusxasi (ZIP), subyekt huquqi |
| POST 🔐 | `/me/delete-request` | Ma'lumotlarni o'chirish so'rovi |

### 3.2. Fayllar
| Metod | Yo'l | Tavsif |
|---|---|---|
| POST 🔐 | `/files/presign` | `{purpose, mime, size}` → `{file_id, upload_url, expires_in}` |
| POST 🔐 | `/files/{id}/complete` | Tekshiruv va ishlov berishni boshlaydi |
| GET 🔐 | `/files/{id}` | Holat va variantlar. Maxfiy fayl uchun 5 daqiqalik havola |

### 3.3. Ma'lumotnomalar 🌐
`GET /public/trades`, `GET /public/trades/{code}`, `GET /public/destinations`, `GET /public/mahallas`, `GET /public/languages`

### 3.4. Arizalar
| Metod | Yo'l | Tavsif |
|---|---|---|
| POST 🌐 | `/applications/draft` | Qoralama `draft_data` ga yoziladi (telefon OTP bilan tasdiqlangandan keyin). `persons` yozuvi yaratilmaydi |
| PATCH 🔐 | `/applications/{id}` | Qadamlarni to'ldirish |
| POST 🔐 | `/applications/{id}/submit` | `persons` yozuvi yaratiladi, `matrix_suggested` hisoblanadi, holat `SUBMITTED` |
| GET 🔐 | `/applications` | Ro'yxat: `status`, `matrix`, `trade`, `mahalla`, `type`, `q` filtrlari |
| POST 🔐 | `/applications/{id}/transition` | `{to_status, note, matrix_final?, rejection_reason?}`. Ruxsat etilgan o'tishlar `01_PRD.md` 7.1 dagi holat mashinasi bo'yicha |
| POST 🔐 | `/applications/import` | Excel (koordinator). Avval `dry_run=true` bilan tekshiriladi, natijada xatolar va dublikatlar ro'yxati qaytadi |
| GET 🔐 | `/applications/export?format=xlsx` | Bandlik organlari formati |
| POST 🔐 | `/applications/{id}/contract` | Ishlab chiqarish ta'limi shartnomasini yaratish (PDF) |

`POST /applications/{id}/submit` javobi:
```json
{
  "id": "…", "status": "SUBMITTED",
  "matrix_suggested": "B",
  "suggested_path": {
    "track": "FOREIGN",
    "summary": "Siz chet tilini bilasiz. Sizga sertifikatlangan kasb o'rgatiladi, keyin brigada boshlig'i sifatida xorijga yo'l ochiladi.",
    "can_be_curator": true
  },
  "next_step": "Mahalla koordinatori siz bilan 3 ish kunida bog'lanadi"
}
```

### 3.5. Ta'lim
| Metod | Yo'l | Tavsif |
|---|---|---|
| CRUD 🔐 | `/courses`, `/courses/{id}/modules` | Kurs va modullar |
| CRUD 🔐 | `/groups` | Guruh yaratish. `max_students` ≤ 10 |
| POST 🔐 | `/groups/{id}/enrollments` | `{student_user_id}` → `409 GROUP_FULL` bo'lishi mumkin |
| POST 🔐 | `/enrollments/{id}/transfer` | Boshqa guruh yoki trekka o'tkazish |
| GET 🔐 | `/groups/{id}/attendance?date=` | Kunlik varaq |
| POST 🔐 | `/groups/{id}/attendance` | Guruh uchun ommaviy kiritish (pastda) |
| POST 🔐 | `/assessments` | Modul bahosi + dalil fayllari |
| GET 🔐 | `/question-bank/draw?trade=&n=30` | Yakuniy test uchun tasodifiy savollar (imtihonchi uchun) |
| POST 🔐 | `/final-exams` | Yakuniy natija |
| CRUD 🔐 | `/curator-groups`, `/curator-groups/{id}/members` | 8–10 a'zo |
| GET 🔐 | `/me/learning` | Tinglovchi: kurs, jadval, progress, "sertifikatgacha nima qoldi" |

`POST /groups/{id}/attendance`:
```json
{
  "date": "2026-12-14",
  "object_id": "…",
  "default_status": "PRESENT",
  "default_site_hours": 6,
  "exceptions": [{"enrollment_id": "…", "status": "ABSENT_EXCUSED", "site_hours": 0}],
  "client_created_at": "2026-12-14T12:03:11Z"
}
```
Sarlavhada `Idempotency-Key` bo'lishi majburiy. Javob: `{"saved": 10, "conflicts": []}`.

### 3.6. Lug'at
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET 🔐 | `/vocab/today` | `{new: [...20], review: [...], streak, learned, total: 1000}` |
| POST 🔐 | `/vocab/answers` | Javoblar paketi (oflayn qo'llab-quvvatlanadi): `[{word_id, correct, answered_at}]` |
| GET/PUT 🔐 | `/vocab/settings` | Til, kasb, kunlik son, xabar vaqti |
| GET 🔐 | `/vocab/stats` | Kategoriyalar bo'yicha progress |
| GET 🔐 | `/vocab/pack?date=` | Oflayn to'plam (so'zlar + audio havolalari) |
| POST 🔐 | `/vocab/pronunciation` | Audio → baho (SI, `07_AI.md`) |
| CRUD 🔐 | `/vocab/words`, `POST /vocab/words/import` | Muallif va muharrir uchun |

### 3.7. Sertifikatlar
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET 🔐 | `/certificates?status=PENDING_APPROVAL` | Tasdiq navbati |
| GET 🔐 | `/certificates/{id}` | Dalillar bilan |
| POST 🔐 | `/certificates/{id}/decisions` | `{decision: APPROVE\|REJECT, comment}`. 2-tasdiqdan keyin imzolash vazifasi ishga tushadi |
| POST 🔐 | `/certificates/{id}/revoke` | `{reason}` |
| POST 🔐 | `/certificates/external` | Davlat yoki xalqaro sertifikatni qayd etish |
| GET 🌐 | `/public/verify/{number}` | Pastda |
| GET 🌐 | `/.well-known/uychibinokor-keys.json` | Ochiq kalitlar (`kid`, `alg: Ed25519`, `x`, `valid_from`, `valid_to`) |

`GET /public/verify/UB-2026-000123`:
```json
{
  "result": "VALID",
  "signature_valid": true,
  "certificate": {
    "number": "UB-2026-000123", "issuer": "UB_NAMDTU",
    "trade": "Santexnik", "level": "ASSISTANT",
    "issued_at": "2027-03-15", "valid_until": null
  },
  "holder": {
    "display_name": "Aziz Karimov", "photo_url": "…",
    "profile_slug": "k7f2m9q4", "verified_hours": 1240,
    "languages": [{"code": "de", "words_learned": 820, "words_total": 1000, "document": "Goethe A2"}],
    "rating": {"avg": 4.8, "count": 12}, "availability": "FREE"
  },
  "other_certificates": [{"issuer": "STATE", "external_ref": "…", "registry_url": "…"}],
  "portfolio": [{"title": "12-maktab, santexnika", "thumb_url": "…"}],
  "checked_at": "2027-04-01T10:00:00Z"
}
```
`result` qiymatlari: `VALID`, `REVOKED` (+ `revoked_at`; sabab ommaga ko'rsatilmaydi), `NOT_FOUND`, `TAMPERED` (imzo mos kelmadi; adminga ogohlantirish yuboriladi).

### 3.8. Ustalar va brigadalar
| Metod | Yo'l | Tavsif |
|---|---|---|
| GET 🌐 | `/public/workers` | `trade`, `level`, `lang`, `min_words`, `availability`, `mahalla`, `min_rating`, `q` filtrlari. Telefon hech qachon qaytmaydi |
| GET 🌐 | `/public/workers/{slug}` | Ochiq profil (BR-18) |
| GET/PATCH 🔐 | `/me/worker-profile` | Usta o'z profilini tahrirlaydi, ko'rinish sozlamalari |
| POST 🔐 | `/me/worker-profile/cv?lang=de` | SI rezyume qoralamasi |
| CRUD 🔐 | `/portfolio-items` | Portfolio |
| POST 🔐 | `/workers/{user_id}/level` | Darajani o'zgartirish (admin) |
| CRUD 🔐 | `/brigades`, `/brigades/{id}/members` | 8–10 a'zo |
| POST 🔐 | `/brigades/{id}/check-readiness` | BR-08 → `{ready, checks: [...]}` |
| GET 🌐 | `/public/brigades` | Faqat `READY` holatidagilar |

### 3.9. Ish beruvchilar va so'rovlar
| Metod | Yo'l | Tavsif |
|---|---|---|
| POST 🔐 | `/employers` | Ro'yxatdan o'tish |
| POST 🔐 | `/employers/{id}/verify` | Admin tekshiruvi |
| GET/POST 🔐 | `/employers/{id}/shortlists` | Saralanganlar ro'yxati |
| POST 🔐 | `/demand-requests` | So'rov `NEW` holatida yaratiladi. `track=FOREIGN` bo'lsa va agentlik biriktirilsa, o'sha tranzaksiyada `VIA_AGENCY` ga o'tadi. Agentlik bo'lmasa `NEW` da qoladi, menejer biriktiradi |
| GET 🔐 | `/demand-requests` | Menejer: kanban ma'lumoti, SLA bilan |
| POST 🔐 | `/demand-requests/{id}/transition` | Holat o'tishi |
| POST 🔐 | `/demand-requests/{id}/ai-suggest` | SI nomzodlari (tavsiya) |
| POST 🔐 | `/demand-requests/{id}/candidates` | Nomzod qo'shish |
| POST 🔐 | `/candidates/{id}/respond` | Usta qabul qiladi yoki rad etadi (bot tugmasi orqali ham) |
| POST 🔐 | `/candidates/{id}/employer-decision` | Ish beruvchi qarori |
| CRUD 🔐 | `/placements` | Joylashtirish |
| POST 🔐 | `/placements/{id}/review` | Baho |

### 3.10. Obyektlar, materiallar, hamkorlar, kontent
| Metod | Yo'l |
|---|---|
| GET 🌐 | `/public/objects?bbox=&status=`, `/public/objects/{id}` |
| CRUD 🔐 | `/objects`, `/objects/{id}/photos`, `/objects/{id}/workers` |
| GET 🌐 | `/public/products?category=&producer=&q=`, `/public/products/{id}`, `/public/producers/{id}` |
| POST 🌐 | `/public/order-requests` (captcha: Cloudflare Turnstile yoki hCaptcha, limit 5 / soat / IP) |
| CRUD 🔐 | `/producers/{id}/products`, `GET/PATCH /producers/{id}/orders` |
| GET 🌐 | `/public/partners` (BR-15 serverda qo'llanadi) |
| CRUD 🔐 | `/partners` |
| GET 🌐 | `/public/news`, `/public/news/{slug}`, `/public/pages/{slug}` |
| CRUD 🔐 | `/cms/news`, `/cms/pages`, `/media` |
| GET 🌐 | `/public/search?q=&types=` | `q` `^UB-\d{4}-\d{6}$` bo'lsa, javob `{redirect: "/verify/UB-…"}`. To'liq ism roziligisiz usta niqoblangan ism bilan keladi, `photo_url` bo'lmaydi |
| GET 🌐 | `/public/stats` (BR-19) |

### 3.11. Hisobotlar va admin
| Metod | Yo'l |
|---|---|
| GET 🔐 | `/reports/funnel?from=&to=&mahalla=&trade=` |
| GET 🔐 | `/reports/kpi` |
| GET 🔐 | `/reports/voucher?format=xlsx` |
| GET 🔐 | `/audit?entity=&actor=&from=` |
| CRUD 🔐 | `/users`, `/users/{id}/roles` |
| GET 🔐 | `/persons/{id}/sensitive` (JShShIR va pasportni ochish; sabab majburiy; audit logiga yoziladi) |

### 3.12. Telegram webhook
`POST /bot/webhook/{secret}`. `X-Telegram-Bot-Api-Secret-Token` sarlavhasi tekshiriladi.

## 4. Veb-hooklar (keyingi bosqich, hamkorlar uchun)

Hodisalar: `certificate.issued`, `certificate.revoked`, `placement.created`.
Imzo: `X-UB-Signature: t=…,v1=HMAC-SHA256`. Qayta yuborish: 1/5/30/120 daqiqadan keyin.
