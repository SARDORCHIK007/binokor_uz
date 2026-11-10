# 08. Test rejasi

## 1. Test darajalari

| Daraja | Vosita | Qamrov | Qachon ishlaydi |
|---|---|---|---|
| Unit (backend) | pytest, hypothesis | `service` ≥ 90%, umumiy ≥ 80% | Har bir PR |
| Unit (frontend) | Vitest, Testing Library | Komponentlar, hooklar, formalar | Har bir PR |
| Integratsiya | pytest + testcontainers (PostgreSQL+PostGIS, Redis, MinIO) | Barcha API endpointlari, triggerlar, migratsiyalar | Har bir PR |
| Shartnoma | schemathesis (OpenAPI asosida) | Barcha endpointlar | Har bir PR |
| Ruxsatlar | Parametrlashtirilgan pytest | `06_SECURITY.md` 4-bo'limdagi matritsaning har bir katagi | Har bir PR |
| E2E | Playwright (Chromium, WebKit, Android emulyatsiyasi) | 4-bo'limdagi ssenariylar | `main` branch, har kuni |
| Vizual regressiya | Playwright screenshot / Storybook | Asosiy sahifalar, 3 breakpoint, uz va ar tillari | Har bir PR (UI o'zgarsa) |
| Qulaylik | axe-core, qo'lda NVDA va TalkBack bilan | Barcha ommaviy sahifalar va asosiy kabinet ekranlari | Har bir PR + har bosqich oxirida |
| Tezlik | Lighthouse CI | Bosh sahifa, verify, kasb, usta profili | Har bir PR |
| Yuklanish | k6 | NFR-CAP-03, NFR-CAP-04 | Har bosqich oxirida, ishga tushirishdan oldin |
| Xavfsizlik | pip-audit, npm audit, trivy, gitleaks, OWASP ZAP baseline | Hammasi | Har bir PR; ZAP har hafta |
| Oflayn | Playwright (`context.setOffline`) | Davomat, lug'at | Har bir PR |
| Tiklash | Zaxiradan staging'ga tiklash skripti | To'liq baza va fayllar | Har oy |

## 2. Test ma'lumotlari

- `seed/demo/`: 53 ta mahalla, 12 kasb, 6 davlat, 20 ta hamkor (har xil holatlarda), 3 ta kurs, 8 ta guruh, 80 ta tinglovchi, 2 ta brigada, 15 ta ish beruvchi, 10 ta obyekt, 40 ta mahsulot, nemis tili uchun 1000 so'z.
- Demo ma'lumotlar `faker` (uz_UZ lokali) bilan yaratiladi. Real shaxsiy ma'lumot testlarda ishlatilmaydi.
- `make seed-demo` buyrug'i staging muhitini 1 daqiqada tayyorlaydi.

## 3. Muhim biznes qoidalari testlari (majburiy)

| Test | Tekshiradi |
|---|---|
| `test_group_capacity_10` | 11-tinglovchi → `409 GROUP_FULL`. Ustozning barcha guruhlarida 11-faol tinglovchi → `409 MENTOR_FULL`. Bir vaqtda 2 ta so'rov kelganda ham (race condition) |
| `test_curator_group_8_10` | 7 a'zoda ogohlantirish, 11-a'zo → 409 |
| `test_domestic_no_language` | Ichki trek kursiga `LANGUAGE` moduli qo'shib bo'lmaydi |
| `test_course_duration_bounds` | Oddiy kurs 170–380 kun (6–12 oy), tezlashtirilgan kurs 80–100 kun (≈3 oy). Kasbda `foreign_lang_months > 0` bo'lsa yig'indi 6–12 oy |
| `test_matrix_classification` | A/B/C/D toifalarining barcha chegaraviy holatlari |
| `test_cert_eligibility` | BR-09 dagi har bir shart alohida buzilganda qoralama yaratilmaydi |
| `test_cert_two_distinct_approvers` | Bir shaxs ikki marta tasdiqlay olmaydi |
| `test_cert_signature_tamper` | Bazada `payload` o'zgartirilsa → `TAMPERED` |
| `test_cert_revoked_visible_immediately` | Bekor qilingandan keyin ≤ 5 s ichida `/verify` sahifasi `REVOKED` ko'rsatadi (kesh yangilanadi) |
| `test_logo_rule` | Logotip faqat `SIGNED` va `logo_permission=true` bo'lganda chiqadi (4 kombinatsiya) |
| `test_foreign_request_via_agency` | Xorijiy so'rov `NEW` yaratiladi. Agentlik shu tranzaksiyada biriktirilsa `VIA_AGENCY`. Agentliksiz `NEW` da qoladi va keyingi bosqichga o'tmaydi |
| `test_employer_never_sees_phone` | Barcha ochiq va ish beruvchi endpointlari javobida telefon raqami yo'q (javob ichida `+998` qidiriladi) |
| `test_brigade_readiness` | BR-08 shartlari |
| `test_leitner_intervals` | Vaqt siljitilganda (freezegun) takrorlash oraliqlari 1/2/4/8/16 kun |
| `test_offline_idempotency` | Bir xil `Idempotency-Key` bilan 3 marta yuborilgan davomat → 1 ta yozuv |
| `test_public_stats_from_db` | Bazada 0 bo'lsa, blok yashiriladi |
| `test_no_pd_in_logs` | Loglarda telefon (to'liq) va JShShIR yo'qligi |
| `test_ai_no_pd_egress` | Tashqi LLM provayderiga yuborilgan so'rovda ism, telefon yoki JShShIR yo'qligi (mock provayder orqali) |

## 4. E2E ssenariylari (Playwright)

| № | Ssenariy |
|---|---|
| E2E-01 | Arizachi telefonda ariza beradi → OTP → 6 qadam → toifa B → kabinetda holat ko'rinadi |
| E2E-02 | Koordinator 50 qatorli Excel import qiladi, 2 ta dublikat aniqlanadi |
| E2E-03 | Admin arizani qabul qiladi → guruhga yozadi → ustozga xabar boradi |
| E2E-04 | Ustoz oflayn rejimda davomat kiritadi → aloqa tiklanadi → sinxronlanadi |
| E2E-05 | Tinglovchi kunlik 20 so'zni o'tadi, progress yangilanadi |
| E2E-06 | Shartlarni bajargan tinglovchi → qoralama → 2 ta tasdiq → PDF Telegram'ga keladi → QR → verify sahifasida `VALID` |
| E2E-07 | Xorijiy ish beruvchi (en) brigada so'raydi → `VIA_AGENCY` → menejer nomzodlarni yuboradi |
| E2E-08 | Ichki ish beruvchi qidiradi → so'rov yuboradi → usta botda qabul qiladi → joylashtirish → baho |
| E2E-09 | Bitta material buyurtmasi → ishlab chiqaruvchiga bot orqali xabar boradi |
| E2E-10 | Sertifikat bekor qilinadi → verify sahifasi `REVOKED` ko'rsatadi |
| E2E-11 | Arab tilidagi verify sahifasi to'g'ri RTL ko'rinishda chiqadi |

## 5. Qabul tartibi

1. Har bir sprint oxirida Claude Code `docs/reports/sprint-N.md` hisobotini yozadi: bajarilgan FR/NFR identifikatorlari, test natijalari, Lighthouse va axe natijalari, ochiq qolgan masalalar.
2. Buyurtmachi staging muhitida E2E ssenariylarini qo'lda o'tadi.
3. Kritik va yuqori darajadagi xatolar soni 0 bo'lsa, bosqich qabul qilinadi.

**Xatolar darajasi:**
| Daraja | Ta'rif |
|---|---|
| Kritik | Ma'lumot yo'qolishi, xavfsizlik, sertifikat noto'g'ri chiqishi |
| Yuqori | Asosiy ssenariy ishlamaydi |
| O'rta | Aylanib o'tish yo'li bor |
| Past | Kosmetik |
