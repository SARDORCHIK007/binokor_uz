# Ertalabki xulosa

Sayt: http://localhost:8090

Oldingi xulosa 1–8 ni dalilsiz DONE deb yozgan. Bu jadval fayl, commit va test bo‘yicha qayta tekshirilgan.

| # | Holat | Fayl va funksiya | Commit | Test | Tekshirish |
|---|---|---|---|---|---|
| 1 | DONE | `learning.save_assessment`, `learning.upload_evidence`; `GradeSheet` | `e816b8f` | `test_practical_grade_saves_score_comment_and_evidence` | http://localhost:8090/kabinet/baholar |
| 2 | DONE | `exams.exam` (LIMIT 30, 20 daqiqa); `seed_exam._ensure_bank` | `e816b8f` | `test_exam_returns_30_questions_and_deadline`, `test_question_bank_has_40_per_trade` | http://localhost:8090/kabinet/imtihon |
| 3 | DONE | `employers.register`, `admin_edu.verify_employer`, `employers.workers`, `add_candidate`, `create_request`, `review` | `e816b8f` va shu tungi test | `test_employer_flow_hides_phone` | http://localhost:8090/kabinet/ishberuvchi |
| 4 | DONE | `producers.create_product`, `update_product`, `delete_product`, `orders` | `e816b8f`; o‘chirish shu tun | `test_producer_product_crud` | http://localhost:8090/kabinet/mahsulotlar |
| 5 | DONE | `AttendanceSheet`, `attendanceQueue.enqueueAttendance`, `public/sw.js`; `learning.save_attendance` | `e816b8f` | `test_offline_idempotency`, `offline attendance client keeps an IndexedDB queue` | http://localhost:8090/kabinet/davomat |
| 6 | DONE | `signing.sign_payload`, `certificates.verify` | `e816b8f` | `test_cert_signature_tamper` | http://localhost:8090/verify/UB-2026-000001 |
| 7 | DONE | `totp.current_code`, `auth.verify_otp`, `auth.confirm_totp` | `e816b8f` | `test_totp_code_matches_current_window`, `test_admin_otp_requires_totp` | http://localhost:8090/kirish |
| 8 | DONE | `messages/uz-Cyrl.json`, `ru.json`, `en.json`; `i18n/request.ts`; `verify` sahifasidagi `COPY` | `e816b8f` | `public locales exist and verify includes de and rtl arabic` | http://localhost:8090/verify/UB-2026-000001?lang=ar |
| 9 | DONE (jonli chat yo‘q) | `notify.send_telegram`, `auth.request_otp`, `bot.main` | `e816b8f` | `test_telegram_without_token_does_not_send` | `.env` da `BOT_TOKEN` bo‘sh. Lokal kod: http://localhost:8090/kirish |
| 10 | DONE | `apps/api/tests/test_rules.py` | `e816b8f` | `test_group_capacity_10` va §3 dagi qolgan 17 ta nom | `docker exec -w /app uychibinokor-api-1 python -m pytest -q` |

## Testlar

- API: 35 o‘tdi, 0 yiqildi (`test_features.py` qo‘shilgach).
- Web: 3 o‘tdi, 0 yiqildi.

## To‘xtagan

Jonli Telegram xabari yuborilmadi, chunki `BOT_TOKEN` bo‘sh va `.env` ga tegilmadi. Kod token bo‘lmasa yubormaydi va lokal rejimda kodni sahifada qoldiradi. `docs/reports/blocked.md`.

## Ertalab birinchi

1. Jadvaldagi URL larni oching.
2. Admin `+998901000001` kirsa, ikkinchi kod so‘ralishini ko‘ring.
3. Telegram kerak bo‘lsa, tokenni o‘zingiz qo‘ying.
