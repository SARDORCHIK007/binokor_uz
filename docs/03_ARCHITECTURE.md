# 03. Arxitektura va funksional bo'lmagan talablar

## 1. Arxitektura qarorlari (ADR)

| ADR | Qaror | Sabab | Rad etilgan variant |
|---|---|---|---|
| ADR-01 | **Modulli monolit**: bitta FastAPI ilovasi, ichida modullarga aniq chegaralar | Bitta dasturchi; pilot hajmi (≈ 1 000 faol foydalanuvchi) mikroservislarni talab qilmaydi | Mikroservislar: ularga xizmat ko'rsatish yolg'iz dasturchi uchun qimmat |
| ADR-02 | Frontend **Next.js 15 (App Router)**, SSR/ISR | Tekshirish va profil sahifalari tez ochilishi va qidiruvda topilishi kerak | Faqat SPA (React + Vite): SEO zaif, birinchi yuklanish sekin |
| ADR-03 | **PostgreSQL 16** yagona ma'lumot manbai: PostGIS, `pg_trgm`, to'liq matnli qidiruv | Bitta baza: kam infratuzilma, tranzaksiyalar butun | Elasticsearch: bu hajm uchun ortiqcha |
| ADR-04 | Fon vazifalari: **Redis + arq** (async) | FastAPI async bilan mos, oddiy | Celery: og'ir |
| ADR-05 | Fayllar: **MinIO** (S3 API), presigned URL | Mahalliy serverda ishlaydi, keyin bulutga ko'chirish oson | Fayllarni bazada saqlash |
| ADR-06 | Kirish: Telegram OTP + **SMS zaxira yo'li** (Eskiz.uz yoki Playmobile), adminlar uchun TOTP 2FA | Telegram bepul, lekin xorijiy servis. Uzilish bo'lsa SMS ishlaydi | Faqat parol |
| ADR-07 | Sertifikat imzosi **Ed25519** (ochiq kalitli) | Uchinchi tomon ochiq kalit bilan tekshira oladi, maxfiy kalit faqat imzolash xizmatida turadi | HMAC: tekshirish uchun maxfiy kalitni ochish kerak bo'ladi |
| ADR-08 | **PWA**: oflayn davomat va lug'at | Obyektlarda aloqa zaif | Native ilova: qimmat, do'konga chiqarish kerak |
| ADR-09 | Xosting **O'zbekistonda** (UZCLOUD, Uzinfocom yoki mahalliy DC) | Qonun bo'yicha shaxsiy ma'lumotlarni lokalizatsiya qilish talabi | AWS / Hetzner |
| ADR-10 | SI: shaxsiy ma'lumot **anonimlashtiriladi**, keyin tashqi LLM'ga yuboriladi; ochiq vaznli model mahalliy serverda ishlatiladi (2-to'lqin) | Lokalizatsiya va maxfiylik | Xom shaxsiy ma'lumotni tashqi API'ga yuborish |

## 2. Kontekst sxemasi

```
                       ┌──────────────────────────────┐
  Arizachi, usta ─────►│                              │◄──── Ish beruvchilar (UZ, xorij)
  Tinglovchi, ustoz ──►│   uychibinokor.uz (Next.js)  │◄──── Hamkorlar (Bandlik, hokimlik, agentlik)
                       └──────────────┬───────────────┘
                                      │ HTTPS (REST /api/v1)
                       ┌──────────────▼───────────────┐
  Telegram Bot API ◄──►│  API (FastAPI, modulli monolit)│──► SMS shlyuz (Eskiz/Playmobile)
                       │  + arq worker + imzo xizmati   │──► Email (SMTP)
                       └──┬──────────┬─────────┬───────┘──► LLM (anonim) / mahalliy model
                          │          │         │
                    PostgreSQL     Redis     MinIO
                    (+PostGIS)                (fayllar, PDF, audio)
  Kelajakda: OneID, Bandlik organlari tizimi, milliy malaka reyestri (havola orqali)
```

## 3. Texnologiyalar steki (versiyalar qotiriladi)

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript 5 (strict), Tailwind CSS 4, shadcn/ui, TanStack Query, React Hook Form + Zod, next-intl, react-three-fiber + drei, Leaflet, Recharts, Serwist (PWA) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic v2, arq, httpx, structlog, PyNaCl (Ed25519), WeasyPrint, qrcode, openpyxl, Pillow, python-magic |
| Bot | aiogram 3 (webhook) |
| Ma'lumotlar | PostgreSQL 16 (PostGIS 3, pg_trgm, pgcrypto, unaccent), Redis 7, MinIO |
| Infratuzilma | Docker Compose, Nginx (reverse proxy, TLS, rate limit), Let's Encrypt, ClamAV, restic (zaxira) |
| Monitoring | Prometheus + Grafana, Loki (loglar), GlitchTip (Sentry bilan mos, o'z serverda), Uptime Kuma |
| CI/CD | GitHub Actions (yoki o'z serverdagi Gitea Actions), GHCR yoki mahalliy registry |
| Sifat | Ruff, mypy (strict), pytest, ESLint, Prettier, Vitest, Playwright, axe-core, Lighthouse CI, k6 |

## 4. Repozitoriy tuzilmasi

```
uychibinokor/
├── CLAUDE.md
├── docs/                       # shu hujjatlar to'plami
├── apps/
│   ├── web/                    # Next.js
│   │   ├── app/[locale]/(public)/...   # ommaviy sahifalar
│   │   ├── app/[locale]/kabinet/...    # kabinetlar (rol bo'yicha)
│   │   ├── components/  lib/  messages/{uz-Latn,uz-Cyrl,ru,en}.json
│   │   │   # de va ar satrlari faqat /verify va ochiq ishchi pasportida
│   │   └── public/3d/  public/sw.js
│   ├── api/
│   │   ├── app/core/           # config, db, security, i18n, errors, audit
│   │   ├── app/modules/
│   │   │   ├── auth/  users/  applications/  education/  vocab/
│   │   │   ├── certificates/  workers/  brigades/  employers/  placements/
│   │   │   ├── objects/  materials/  partners/  cms/  reports/  ai/  notifications/
│   │   │   └── (har birida: models.py, schemas.py, service.py, router.py, tests/)
│   │   ├── app/workers/        # arq vazifalari
│   │   ├── app/signing/        # imzolash xizmati (alohida konteyner)
│   │   └── migrations/
│   └── bot/
├── packages/ui/                # tokenlar, umumiy komponentlar, Storybook
├── packages/api-client/        # OpenAPI'dan avtomatik generatsiya qilingan TS klient
├── infra/  (compose.*.yml, nginx/, grafana/, backup/)
└── seed/   (trades.yaml, mahallas.yaml, partners.yaml, vocab/*.csv, demo/)
```

**Modul qoidasi:** modul boshqa modulning jadvaliga to'g'ridan-to'g'ri murojaat qilmaydi. Boshqa modul ma'lumoti faqat uning `service.py` funksiyalari orqali olinadi. Bu qoida `import-linter` bilan CI'da tekshiriladi.

## 5. Funksional bo'lmagan talablar (NFR)

### 5.1. Tezlik (PERF)
| ID | Talab |
|---|---|
| NFR-PERF-01 | Ommaviy sahifalar, 4G mobil (Moto G Power profili): LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1. Lighthouse Performance ≥ 90 |
| NFR-PERF-02 | Bosh sahifaning JS hajmi (3D'siz) ≤ 200 KB gzip. 3D to'plami alohida va lazy yuklanadi |
| NFR-PERF-03 | API javob vaqti p95 ≤ 300 ms, p99 ≤ 800 ms (o'qish). Yozish p95 ≤ 500 ms |
| NFR-PERF-04 | Qidiruv (`/public/search`) p95 ≤ 300 ms, 100 000 yozuvgacha |
| NFR-PERF-05 | Sertifikat PDF'i tasdiqdan keyin ≤ 30 soniyada tayyor bo'ladi |
| NFR-PERF-06 | `/verify` sahifasi CDN/ISR keshidan ≤ 1 s da ochiladi. Holat o'zgarsa, kesh darhol yangilanadi (revalidate) |

### 5.2. Hajm va yuklanish (CAP)
| ID | Talab |
|---|---|
| NFR-CAP-01 | Pilot: 3 000 ro'yxatdan o'tgan foydalanuvchi, 800 tinglovchi, 80 ustoz, 200 ish beruvchi |
| NFR-CAP-02 | 2028-yilgacha kengayish: 30 000 foydalanuvchi, 10 000 bitiruvchi. Arxitektura o'zgartirilmaydi, faqat serverlar kattalashtiriladi |
| NFR-CAP-03 | Bir vaqtda 300 faol foydalanuvchi va 50 so'rov/s (k6 bilan tekshiriladi, xatolar < 1%) |
| NFR-CAP-04 | Tadbirdagi cho'qqi (hokim taqdimoti, ommaviy QR skaneri): `/verify` sahifasiga 200 so'rov/s, kesh orqali |

### 5.3. Ishonchlilik (REL)
| ID | Talab |
|---|---|
| NFR-REL-01 | Ishlash vaqti (uptime) ≥ 99,5% oyiga (rejali ishlar tungi 02:00–05:00 da, oldindan e'lon qilinadi) |
| NFR-REL-02 | RPO ≤ 15 daqiqa (WAL arxivlash), RTO ≤ 4 soat |
| NFR-REL-03 | Zaxira nusxa: har kuni to'liq nusxa + uzluksiz WAL. 30 kun saqlanadi, nusxa shifrlanadi. Bitta nusxa boshqa ma'lumotlar markazida (O'zbekiston ichida) turadi |
| NFR-REL-04 | Zaxiradan tiklash har oy sinab ko'riladi va natijasi qayd etiladi |
| NFR-REL-05 | Tashqi servis (Telegram, SMS, LLM) ishlamasa, asosiy funksiyalar to'xtamaydi. Xabarlar navbatda qoladi, 24 soat davomida qayta yuboriladi |
| NFR-REL-06 | Har bir yozish so'rovi `Idempotency-Key` sarlavhasini qabul qiladi (oflayn sinxronlash uchun majburiy) |

### 5.4. Qo'llab-quvvatlash (MNT)
| ID | Talab |
|---|---|
| NFR-MNT-01 | Backend testlari bilan qamrov ≥ 80% (`service` qatlami ≥ 90%) |
| NFR-MNT-02 | Barcha API OpenAPI 3.1 orqali avtomatik hujjatlashtiriladi. TS klienti shundan generatsiya qilinadi |
| NFR-MNT-03 | Migratsiyalar faqat Alembic orqali va qaytariladigan (`downgrade`) qilib yoziladi |
| NFR-MNT-04 | Sozlamalar `.env` orqali beriladi (12-factor). Maxfiy ma'lumotlar repozitoriyda saqlanmaydi |
| NFR-MNT-05 | Kodda izohlar ingliz tilida, interfeys matnlari faqat `messages/*.json` faylida |

### 5.5. Moslik (CMP)
| ID | Talab |
|---|---|
| NFR-CMP-01 | Brauzerlar: Chrome/Edge so'nggi 2 versiya, Safari iOS 16+, Samsung Internet, Firefox ESR. Android 9+ |
| NFR-CMP-02 | Eng kichik ekran 360×640 |
| NFR-CMP-03 | Telegram Mini App sifatida ochilganda ham ishlaydi (lug'at va davomat) **[S]** |

## 6. Asosiy texnik yechimlar

### 6.1. Qidiruv
- `search_index` materiallashtirilgan ko'rinishi (materialized view) usta, mahsulot va obyekt ma'lumotlaridan tuziladi va har 5 daqiqada, shuningdek hodisa bo'yicha yangilanadi. Sertifikatlar indeksga kiritilmaydi.
- To'liq ism roziligi yo'q usta indeksda qoladi. Uning nomi niqoblanadi (`Aziz Karimov` → `Aziz K.`), rasmi qidiruv javobiga kirmaydi.
- `tsvector('simple', unaccent(...))` va `pg_trgm` (xato yozilgan so'zlarni topish uchun) ishlatiladi. Lotin va kirill yozuvlari bitta indeksga keltiriladi: kirill matni lotinga transliteratsiya qilinib, ikkalasi saqlanadi.
- So'rov `^UB-\d{4}-\d{6}$` ga mos kelsa, qidiruv indeksiga bormaydi va to'g'ridan-to'g'ri `/verify/{number}` sahifasiga yo'naltiriladi.

### 6.2. Fayllar oqimi
```
Klient → POST /files/presign (turi, hajmi) → presigned PUT (MinIO, `quarantine/` papka)
→ POST /files/{id}/complete → worker: python-magic (haqiqiy tur) → ClamAV → Pillow (EXIF tozalash,
  geolokatsiyani alohida saqlash, AVIF/WebP variantlari) → `public/` yoki `private/` papkasiga ko'chirish
```
- Ruxsat etilgan turlar: JPEG, PNG, WebP, HEIC (rasm, ≤ 15 MB), PDF (≤ 10 MB), MP3/OGG/M4A (audio, ≤ 2 MB).
- Shaxsiy hujjatlar (pasport nusxasi, shartnomalar) `private/` papkada saqlanadi va faqat 5 daqiqalik presigned GET orqali ochiladi.

### 6.3. Oflayn rejim (PWA)
- Service Worker (Serwist): ilova qobig'i, shriftlar, bugungi lug'at to'plami va audio keshlanadi.
- Davomat va obyekt soatlari IndexedDB navbatiga yoziladi. Har bir yozuvda `Idempotency-Key` (UUID v7) va `client_created_at` bor.
- Aloqa tiklanganda Background Sync (bo'lmasa `online` hodisasi) orqali yuboriladi.
- Ziddiyat qoidasi: server bo'yicha so'nggi yozuv ustun turadi va bu `audit_log`ga yoziladi. Ustozga "sinxronlandi" belgisi ko'rsatiladi.

### 6.4. Fon vazifalari (arq)
| Vazifa | Jadval |
|---|---|
| `certificates.find_eligible` | har kuni 02:00 |
| `notifications.dispatch` | navbatdan doimiy, qayta urinish: 1/5/30/120 daqiqa |
| `vocab.daily_push` | har 15 daqiqada (foydalanuvchi tanlagan vaqt bo'yicha) |
| `education.absence_alerts` | har kuni 20:00 |
| `search.refresh` | har 5 daqiqa + hodisa bo'yicha |
| `reports.snapshot` | har kuni 03:00 (KPI tarixi) |
| `files.process` | hodisa bo'yicha |
| `backup.verify` | har hafta |
| `materials.stale_prices` | har kuni |

### 6.5. Imzolash xizmati
- Alohida konteyner (`signing`), tashqi tarmoqdan ajratilgan, faqat ichki API orqali ishlaydi: `POST /sign {payload_hash}` → `{signature, key_id}`.
- Maxfiy kalit fayl tizimida shifrlangan holda turadi va ishga tushganda parol bilan ochiladi (`age`). Kalitni almashtirish (rotatsiya) yiliga bir marta, eski kalitlar `keys.json` faylida tekshirish uchun saqlanib qoladi.
- Kanonik JSON: RFC 8785 (JCS).

### 6.6. Tillar (i18n)
- Interfeys lokallari: `uz-Latn` (asosiy), `uz-Cyrl`, `ru`, `en`. `de` va `ar` butun interfeys uchun emas, faqat `/verify` va ochiq ishchi pasportida.
- URL: `/{locale}/...`. Standart til uchun prefiks qo'yilmaydi. `hreflang` belgilari qo'yiladi.
- Ma'lumotlar bazasidagi tarjima qilinadigan maydonlar `jsonb` sifatida saqlanadi: `{"uz-Latn": "...", "ru": "...", ...}`. Tarjima bo'lmasa `uz-Latn` ko'rsatiladi.
- Lotin → kirill transliteratsiyasi kutubxona orqali qilinadi, keyin qo'lda tekshiriladi (`content_editor`).

### 6.7. Kesh
- ISR (Next.js): ommaviy ro'yxatlar 60 s, kasblar va loyiha sahifalari 1 soat, `/verify` sahifasi talab bo'yicha qayta yangilanadi (`revalidateTag('cert:{number}')`).
- Redis: sessiya, rate limit, statistika (60 s).
- Nginx: statik fayllar 1 yil, `immutable`.

## 7. Muhitlar va joylashtirish

| Muhit | Maqsadi | Ma'lumotlar |
|---|---|---|
| `local` | Ishlab chiqish (Docker Compose) | Seed + demo |
| `staging` | Buyurtmachiga ko'rsatish, qabul testlari | Anonimlashtirilgan demo |
| `production` | Ishchi muhit | Real ma'lumotlar |

**Server o'lchami (pilot uchun, production):**
- 1 ta ilova serveri: 8 vCPU, 16 GB RAM, 200 GB SSD.
- 1 ta baza serveri: 4 vCPU, 16 GB RAM, 200 GB SSD.
- Ikkinchi DC'da 200 GB zaxira saqlash joyi.

Staging uchun 4 vCPU va 8 GB RAM yetarli. Taxminiy narx mahalliy provayderdan so'rov orqali aniqlanadi.

**CI/CD (har bir PR uchun):**
```
lint (ruff, eslint) → type-check (mypy, tsc) → unit tests → integration tests (testcontainers: PG, Redis, MinIO)
→ build → e2e (Playwright, staging-mock) → axe + Lighthouse CI → security (pip-audit, npm audit, trivy, gitleaks)
→ main branch: staging'ga avtomatik deploy → production: qo'lda tasdiqlanadi (tag), migratsiya → blue/green
```

## 8. Monitoring va loglar

- Strukturalangan JSON loglar (`structlog`). Har bir so'rovda `request_id` bor va u javob sarlavhasiga ham qo'shiladi.
- **Loglarga shaxsiy ma'lumot yozilmaydi**: telefon `+99890***1234` ko'rinishida, JShShIR umuman yozilmaydi.
- Metrikalar: so'rovlar soni, kechikish va xatolar (RED metrikalari), navbat uzunligi, PDF yaratish vaqti, OTP muvaffaqiyati, oflayn sinxronlash xatolari.
- Ogohlantirishlar (Telegram'dagi admin guruhiga):
  - 5xx > 1% (5 daqiqa davomida);
  - p95 > 1 s;
  - disk > 80%;
  - zaxira nusxa olinmadi;
  - sertifikat imzolash xatosi;
  - OTP muvaffaqiyati < 90%.
- Ochiq holat sahifasi: `status.uychibinokor.uz` (Uptime Kuma).

## 9. Integratsiyalar

| Tizim | Bosqich | Usul | Holati |
|---|---|---|---|
| Telegram Bot API | 1 | Webhook | Majburiy |
| SMS shlyuz | 1 | REST | Majburiy (zaxira kanal) |
| Email (SMTP) | 2 | SMTP | Ish beruvchilar uchun |
| OneID | 4 | OAuth2 | Shartnoma tuzish kerak |
| Bandlik organlari | 2 | Kelishilgan Excel formati, keyinroq API | Format kelishiladi |
| Milliy malaka reyestri | 2 | Havola (deep link) | API bo'lsa, keyinroq |
| Tashqi mehnat migratsiyasi agentligi | 3 | Agentlik kabineti + eksport | Hamkorlik kelishilgach |
| LLM provayder | 3 | REST, anonimlashtirilgan ma'lumot | `07_AI.md` |
