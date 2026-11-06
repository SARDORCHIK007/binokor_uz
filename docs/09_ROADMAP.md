# 09. Yo'l xaritasi va Claude Code uchun buyruqlar

## 1. Muddatlar (taxminiy, bitta dasturchi + Claude Code)

2-hujjat bo'yicha birinchi guruhlar **2026-yil dekabr** oyida boshlanadi. Shuning uchun o'quv tizimi (S2) dekabr o'rtasigacha tayyor bo'lishi shart. Sertifikat kerak bo'ladigan vaqt — birinchi bitiruv, ya'ni eng qisqa 3 oylik kurs bo'yicha **2027-yil mart**.

| Sprint | Sana | Natija | Qabul uchun asosiy hujjatlar |
|---|---|---|---|
| **S0** | 9–15 noyabr | Repozitoriy, CI, Docker, tokenlar, 4 ta asosiy ekran prototipi (D-3) | 02, 03 |
| **S1** | 16–29 noyabr | Kirish (OTP + 2FA), ommaviy portal, ariza, admin: arizalar, hamkorlar, CMS, media; sertifikatni qo'lda kiritish + `/verify` | 01 §8.1–8.2, 05 §3.1–3.4 |
| **S2** | 30 noyabr – 13 dekabr | Kurslar, guruhlar (≤10), o'qishga yozish, PWA davomat (oflayn), ustoz/talaba/koordinator kabinetlari, bot xabarnomalari | 01 §8.3, 03 §6.3 |
| — | **14 dekabr** | **Pilot boshlanishi (birinchi guruhlar)** | |
| **S3** | 14–27 dekabr | Baholar, yakuniy imtihon, sertifikatni avtomatik shakllantirish, imzolash xizmati, PDF, ishchi profili | 01 §8.5–8.6, 06 §5 |
| **S4** | 4–17 yanvar | Lug'at moduli, kuratorlar, kunlik so'zlar boti, oflayn to'plam, muallif kabineti, AI-06 | 01 §8.4, 07 |
| **S5** | 18–31 yanvar | Ish beruvchilar, so'rovlar kanbani, brigadalar, joylashtirish, baholar, AI-01, agentlik oqimi | 01 §8.7, 07 §2.1 |
| **S6** | 1–14 fevral | Obyektlar xaritasi, materiallar, hisobotlar va Excel, `/en` versiya, verify sahifasi de/ar tillarida, AI-02/04/05 | 01 §8.8–8.9, 07 |
| **S7** | 15–28 fevral | Mustahkamlash: yuklanish testi, pentest, ASVS tekshiruvi, zaxiradan tiklash sinovi, hujjatlar | 06 §10, 08 |
| — | **mart 2027** | **Birinchi sertifikatlar, ommaviy ishga tushirish** | |
| S8+ | mart – aprel | AI-03 talaffuz, AI-07 prognoz, OneID, 2-to'lqin tillari (ja, ko, tr), qorong'i rejim | |

## 2. Buyurtmachi ta'minlaydigan narsalar (kodga bog'liq emas)

| № | Nima | Kim | Kerak bo'ladigan sana |
|---|---|---|---|
| B-1 | `uychibinokor.uz` domeni | Operator | S0 |
| B-2 | O'zbekistondagi server (production + staging + zaxira) | Operator / hokimlik | S1 oxiri |
| B-3 | SMS shlyuz shartnomasi (Eskiz yoki Playmobile) | Operator | S1 |
| B-4 | Telegram bot (`@uychibinokor_bot`) va admin guruhi | Dasturchi | S0 |
| B-5 | Uychidagi real rasmlar (≥ 30 ta: yangilangan binolar, yo'llar, obyektlar, ustaxonalar) | Hokimlik matbuot xizmati / fotograf | S1 |
| B-6 | Hamkorlar ro'yxati, holatlari, logotiplari va **logotipdan foydalanishga yozma ruxsatlar** | Operator | S1 |
| B-7 | 53 ta mahalla ro'yxati va koordinatorlar | Hokimlik | S1 |
| B-8 | Kasblar bo'yicha yakuniy muddatlar, soatlar, narxlar, maosh oraliqlari | O'quv rahbari, NamDTU | S2 |
| B-9 | Ustozlar ro'yxati (≈ 75 kishi, 1:10 nisbatda) | O'quv rahbari | S2 |
| B-10 | Ishlab chiqarish ta'limi shartnomasi shabloni (yurist tasdiqlagan) | Yurist | S2 |
| B-11 | Har bir kasb uchun savollar banki (≥ 150 savol) va amaliy rubrikalar | NamDTU, ustozlar | S3 |
| B-12 | Nemis, ingliz va arab tillari uchun 1000 so'z (rasm va audio bilan) | Til bo'yicha OTM bitiruvchilari | S4 |
| B-13 | Davlatlar bo'yicha talablar (til, imtihonlar) — tasdiqlangan ma'lumot | Joylashtirish menejeri, agentlik | S5 |
| B-14 | Ma'lumotlar bazasini davlat reyestrida ro'yxatdan o'tkazish | Operator | S7 |
| B-15 | Maxfiylik siyosati va foydalanish shartlari (4 tilda) | Yurist | S7 |
| B-16 | Mustaqil pentest | Tashqi tashkilot | S7 |

## 3. Claude Code uchun buyruqlar

Har bir buyruq yangi sessiyada beriladi. Har bir sprint oxirida Claude Code `docs/reports/sprint-N.md` faylini yozadi.

### S0
```
docs/ papkasidagi barcha hujjatlarni va CLAUDE.md ni o'qi. S0 sprintini bajar:
1) 03_ARCHITECTURE.md §4 bo'yicha monorepo tuzilmasini yarat (apps/web, apps/api, apps/bot, packages/ui, packages/api-client, infra, seed).
2) Docker Compose: postgres+postgis, redis, minio, clamav, api, worker, web, bot, nginx. `make up`, `make test`, `make seed-demo` buyruqlari ishlasin.
3) CI (GitHub Actions): 03 §7 dagi pipeline. Hozircha bo'sh testlar bilan ham yashil bo'lsin.
4) 02_DESIGN_SYSTEM.md §2–7 bo'yicha tokenlar, Tailwind konfiguratsiyasi va Storybook. Asosiy komponentlarni barcha holatlari bilan yarat.
5) 02 §8.1–8.4 dagi 4 ta ekranni statik prototip qilib yasa (demo ma'lumot bilan), staging'ga joylashga tayyorla.
Ishni tugatgach, qabul mezonlari bo'yicha hisobot yoz. Yaratilmagan narsalarni aniq ko'rsat.
```

### S1
```
S1 sprintini bajar (09_ROADMAP.md). Doiralar: 01_PRD §8.1, §8.2, §8.9 (hamkorlar, CMS, media); 05_API §3.1–3.4, §3.10 (public), §3.12; 06_SECURITY §3, §5, §6.
- 04_DATA_MODEL.sql dagi tegishli jadvallar uchun Alembic migratsiyalari.
- OTP (Telegram + SMS zaxira), JWT/refresh, admin uchun TOTP 2FA, sessiyalar.
- Ruxsatlar: policy qatlami va 06 §4 dagi matritsaning shu sprintga oid kataklari uchun testlar.
- Ommaviy sahifalar (6 til uchun i18n tuzilmasi, hozircha uz-Latn, uz-Cyrl, ru, en tillari to'ldiriladi), SEO, sitemap.
- Ariza wizard'i, balans matritsasi, koordinator importi (dry_run bilan).
- Fayllar oqimi (presign → ClamAV → variantlar).
- Sertifikatni qo'lda kiritish va /verify sahifasi (imzo bilan, 06 §5).
08_TEST_PLAN §3 dagi tegishli testlar majburiy. Lighthouse ≥ 90, axe kritik xatolar = 0.
```

### S2
```
S2 sprintini bajar. Doiralar: 01_PRD §8.3 (FR-EDU-01..10, 08 dan tashqari), 03 §6.3 (PWA, oflayn), 05 §3.5, NTF jadvalidagi ta'lim xabarlari.
Muhim: guruh ≤ 10 va ustoz bo'yicha jami faol tinglovchilar ≤ 10 (BR-01) trigger va API darajasida; davomat ekrani 02 §8.3 bo'yicha, 10 kishilik guruh uchun 30 soniyadan kam vaqtda kiritiladi; Idempotency-Key majburiy.
E2E-03 va E2E-04 ssenariylari o'tishi shart.
```

### S3
```
S3 sprintini bajar. Doiralar: FR-EDU-05/06, FR-CERT-01..10, FR-WRK-01..03, 03 §6.5 (imzolash xizmati alohida konteynerda), 06 §5.
Sertifikat PDF'i 02 §12 D-6 va 01 §8.5 bo'yicha, PDF/A-2b. Ochiq kalitlar /.well-known manzilida.
E2E-06 va E2E-10 ssenariylari, test_cert_* testlari o'tishi shart.
```

### S4
```
S4 sprintini bajar. Doiralar: 01_PRD §8.4 (FR-VOC-01..10, FR-VOC-07 dan tashqari), FR-EDU-10 (kurator kabineti), bot kunlik xabarlari, oflayn lug'at to'plami, AI-06 (lug'at yordamchisi).
Nemis tili uchun seed/vocab/de.csv (namuna 100 so'z) bilan sinab ko'r. Import formati 01 §8.4.1 bo'yicha.
test_leitner_intervals testi va E2E-05 ssenariysi o'tishi shart.
```

### S5
```
S5 sprintini bajar. Doiralar: 01_PRD §8.6 (brigadalar), §8.7, 05 §3.8–3.9, 07 §2.1 (AI-01, LLM'siz).
BR-14 (xorijiy so'rov agentlik orqali), BR-17 (telefon hech qayerda ko'rinmaydi) uchun testlar majburiy. E2E-07, E2E-08.
```

### S6
```
S6 sprintini bajar. Doiralar: 01_PRD §8.8, FR-REP-01..04, FR-PUB-06/07/09, FR-CERT-08 (de, ar, RTL), 07 §2.2, §2.4, §2.5.
SI uchun anonymizer va guards modullari, test_ai_no_pd_egress testi majburiy. E2E-09, E2E-11.
```

### S7
```
S7 sprintini bajar: 08_TEST_PLAN dagi barcha testlar to'liq ishlasin; k6 bilan NFR-CAP-03/04 tekshirilsin; OWASP ZAP; 06 §10 dagi tekshiruv ro'yxati; zaxiradan tiklash skripti va uni sinash; production'ga joylash bo'yicha runbook (docs/runbook.md). Natijalarni hisobotga yoz.
```

## 4. Xavflar (ishlab chiqish jarayoni bo'yicha)

| Xavf | Ehtimoli | Chora |
|---|---|---|
| Bitta dasturchi: kasallik yoki boshqa topshiriqlar sabab kechikish | Yuqori | Sprintlar qat'iy tartibda; S4–S6 ni 2 haftaga surish mumkin, S2 esa surilmaydi |
| Kontent (B-5, B-6, B-11, B-12) kechikadi | Yuqori | Platforma kontentsiz ham ishlaydi; o'rniga illyustratsiya va "tez orada" holatlari ko'rsatiladi |
| Server o'z vaqtida berilmaydi | O'rta | Staging vaqtincha VPS'da faqat demo ma'lumot bilan; real ma'lumot faqat O'zbekistondagi serverda |
| 3D sahnalar ko'p vaqt oladi | O'rta | S0–S1 da poster va video bilan chiqiladi, 3D S6 gacha bosqichma-bosqich qo'shiladi |
| Claude Code hujjatdan chetga chiqadi | O'rta | CLAUDE.md qoidalari, sprint hisobotlari, testlar majburiy |
