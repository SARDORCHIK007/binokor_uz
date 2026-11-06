# Ertalabki xulosa

Sayt ishlayapti: http://localhost:8090

## Bajarilgan

1. Amaliy baho: rubrika, 0–100, izoh, rasm. http://localhost:8090/kabinet/baholar
2. Imtihon: 30 savol, 20 daqiqa, har kasbda kamida 40 savol. http://localhost:8090/kabinet/imtihon
3. Ish beruvchi kabineti. Telefon javobda yo‘q. http://localhost:8090/kabinet/ishberuvchi
4. Ishlab chiqaruvchi kabineti. http://localhost:8090/kabinet/mahsulotlar
5. Oflayn davomat. http://localhost:8090/kabinet/davomat
6. Ed25519 imzo. Buzilgan sertifikat TAMPERED. http://localhost:8090/verify/UB-2026-000001
7. Admin uchun TOTP. http://localhost:8090/kirish
8. Tillar: UZ, ЎЗ, RU, EN. Tekshiruvda de va ar (RTL).
9. Telegram kodi yozilgan. Jonli yuborish token kutadi.
10. Testlar yozildi va ishlatildi.
11. 360px: bosh sahifa, materiallar, obyektlar, ariza, davomat va baholar sig‘adi. Ochiq va kabinet sahifalari HTTP 200.

## Testlar

- API: 27 o‘tdi, 0 yiqildi.
- Web: 1 o‘tdi, 0 yiqildi.

## To‘xtagan

Telegram xabari. `.env` da `BOT_TOKEN` bo‘sh. Tokenni qo‘yib, botni qayta ishga tushirish kerak. Batafsil: `docs/reports/blocked.md`.

## Ertalab birinchi tekshiring

1. http://localhost:8090 — telefon kengligida menyu.
2. http://localhost:8090/kabinet/baholar — ustoz `+998901200001`.
3. http://localhost:8090/verify/UB-2026-000001?lang=ar — o‘ngdan chapga.
4. Agar Telegram kerak bo‘lsa, `BOT_TOKEN` ni to‘ldiring.
