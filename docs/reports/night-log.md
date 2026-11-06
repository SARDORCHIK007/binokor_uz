# Tungi jurnal

## 19:20 — 1. Amaliy baho
Natija: tayyor. Rubrika, 0–100, izoh va rasm dalil saqlanadi.
Tekshiruv: http://localhost:8090/kabinet/baholar (360px, gorizontal chiqish yo‘q).

## 19:20 — 2. Yakuniy imtihon
Natija: tayyor. Har kasbda 40 savol, imtihonda 30 tasi, 20 daqiqa.
Tekshiruv: http://localhost:8090/kabinet/imtihon

## 19:20 — 3. Ish beruvchi
Natija: tayyor. Ro‘yxat, admin tasdig‘i, qidiruv, nomzod, so‘rov, holat, baho. Telefonsiz javob.
Tekshiruv: http://localhost:8090/kabinet/ishberuvchi

## 19:20 — 4. Ishlab chiqaruvchi
Natija: tayyor. Mahsulot qo‘shish/yangilash va kelgan buyurtmalar.
Tekshiruv: http://localhost:8090/kabinet/mahsulotlar

## 19:21 — 5. Oflayn davomat
Natija: tayyor. Banner, IndexedDB navbat, Idempotency-Key, onlayn bo‘lgach yuborish.
Tekshiruv: http://localhost:8090/kabinet/davomat

## 19:21 — 6. Ed25519
Natija: tayyor. O‘zgartirilgan payload `/verify` da TAMPERED.
Tekshiruv: http://localhost:8090/verify/UB-2026-000001

## 19:21 — 7. Admin 2FA
Natija: tayyor. Admin rollari ikkinchi kod so‘raydi. Lokal rejimda kod sahifada.
Tekshiruv: http://localhost:8090/kirish

## 19:22 — 8. Tillar
Natija: tayyor. UZ, ЎЗ, RU, EN. Tekshiruvda de va ar; ar RTL.
Tekshiruv: http://localhost:8090/verify/UB-2026-000001?lang=ar

## 19:22 — 9. Telegram
Natija: kod ulangan, jonli yuborish to‘xtagan. `.env` dagi BOT_TOKEN bo‘sh. Faylga tegilmadi.
Tekshiruv: http://localhost:8090/kirish

## 19:23 — 10. Biznes testlar
Natija: pytest 27 o‘tdi, 0 yiqildi. Web test 1 o‘tdi.
Tekshiruv: `apps/api/tests/test_rules.py`

## 19:25 — 11. 360px
Natija: sarlavha, ism tugmasi va pastki menyu sig‘adigan qilindi.
Tekshiruv: /, /materiallar, /obyektlar, /ariza, /kabinet/davomat, /kabinet/baholar. Barcha ochiq sahifalar HTTP 200.
