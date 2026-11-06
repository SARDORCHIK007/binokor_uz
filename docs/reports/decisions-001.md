# Qarorlar 001 — S0 savollari

Sana: 2026-11-06. Buyurtmachi qarori. Hujjat manba, keyin kod.

| № | Savol | Qaror | O'zgargan fayllar |
|---|---|---|---|
| 1 | Ariza qoralamasida `persons` va `matrix_suggested` qachon yoziladi? | Qoralama `applications.draft_data jsonb` da saqlanadi. `persons` yozuvi faqat topshirishda yaratiladi. `person_id` va `matrix_suggested` bo'sh bo'lishi mumkin. Cheklov: `CHECK (status = 'DRAFT' OR (person_id IS NOT NULL AND matrix_suggested IS NOT NULL))`. | `docs/01_PRD.md`, `docs/04_DATA_MODEL.sql`, `docs/05_API.md` |
| 2 | Ustoz limiti guruhdami yoki jami? | Ikkalasi: guruhda ko'pi bilan 10 va ustozning barcha guruhlarida faol tinglovchilar ko'pi bilan 10. Ikkalasi ham triggerda. | `docs/01_PRD.md`, `docs/04_DATA_MODEL.sql`, `docs/05_API.md`, `docs/08_TEST_PLAN.md`, `docs/09_ROADMAP.md`, `AGENTS.md`, `CLAUDE.md` |
| 3 | Trek muddati qaysi chegara? | `DOMESTIC` kurs 80–190 kun (3–6 oy). `FOREIGN` kurs 170–380 kun (6–12 oy). Cheklov trekka bog'liq. Kasbda `domestic_months` 3..6. `foreign_lang_months > 0` bo'lsa, yig'indi 6..12. | `docs/04_DATA_MODEL.sql`, `docs/08_TEST_PLAN.md` |
| 4 | Nechta til, `/en` qaysi sprintda? | Interfeys 4 lokal: `uz-Latn`, `uz-Cyrl`, `ru`, `en`. `de` va `ar` faqat `/verify` va ochiq ishchi pasportida. `/en` S6 da (yo'l xaritasi ustun). | `docs/01_PRD.md`, `docs/03_ARCHITECTURE.md` |
| 5 | OTP kanalini kim tanlaydi? | Server tanlaydi. Standart — Telegram. SMS faqat bog'langan Telegram bo'lmasa yoki yetkazish muvaffaqiyatsiz bo'lsa, va faqat captcha bilan. API dagi `channel` faqat afzallik. | `docs/05_API.md`, `docs/06_SECURITY.md` |
| 6 | Roziliksiz usta va sertifikat qidiruvda qanday? | To'liq ism roziligisiz usta indeksda qoladi, nomi niqoblanadi (`Aziz K.`), rasmi yo'q. Sertifikatlar indeksda yo'q. So'rov `^UB-\d{4}-\d{6}$` bo'lsa, `/verify/{number}` ga yo'naltiriladi. | `docs/01_PRD.md`, `docs/03_ARCHITECTURE.md`, `docs/04_DATA_MODEL.sql`, `docs/05_API.md` |
| 7 | Xorijiy so'rov qaysi holatda yaratiladi? | `NEW` da yaratiladi. Agentlik shu tranzaksiyada biriktirilsa, holat `VIA_AGENCY` ga o'tadi. Agentlik bo'lmasa `NEW` da qoladi, menejer biriktiradi. Holat mashinasi (PRD) to'g'ri. | `docs/01_PRD.md`, `docs/05_API.md`, `docs/08_TEST_PLAN.md` |
| 8 | BR-02 va BR-07 bazada qanday? | BR-02: trigger faqat 10 tadan oshirishni to'sadi. 8 tadan kam — ogohlantirish, cheklov emas. BR-07: a'zolar triggeri 10 tadan oshirmaydi. 8–10 tekshiruvi `READY` ga o'tishda (servis va holat triggeri). | `docs/01_PRD.md`, `docs/04_DATA_MODEL.sql`, `AGENTS.md`, `CLAUDE.md` |
| 9a | `EXPIRED` holati | Holat mashinasiga `ISSUED → EXPIRED` qo'shildi. Faqat tashqi sertifikat (`issuer` `UB_NAMDTU` emas) va `valid_until` bor bo'lsa. | `docs/01_PRD.md`, `docs/04_DATA_MODEL.sql` |
| 9b | `SAFETY` soatlari | `SAFETY` moduli soatlari nazariya soatlari ichida hisoblanadi. | `docs/01_PRD.md`, `docs/04_DATA_MODEL.sql` |
| 9c | AI-06 qaysi sprint? | S4. | `docs/07_AI.md`, `docs/09_ROADMAP.md` |
| 9d | `GET /health` | API shartnomasiga qo'shildi: DB, Redis, MinIO. Hammasi `ok` bo'lsa 200, aks holda 503. | `docs/05_API.md` |
| 9e | `AGENTS.md` va `CLAUDE.md` | Ataylab bir xil. Birga yangilanadi. | `AGENTS.md`, `CLAUDE.md` |
