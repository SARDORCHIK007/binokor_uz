# Sprint hisoboti — sifat va funksiyalar (2026-11-09)

Barcha o'zgarishlar `master` shoxida, GitHub CI (lint, tiplar, migratsiya, testlar) har yuklashda ishlaydi.

## Nima qilindi

| # | Ish | Talab | Commit |
|---|-----|-------|--------|
| 1 | Qidiruv jonli jadvallardan; kasb, usta, material, obyekt; natijalar havola; yashirin familiya qidiruvda chiqmaydi | FR-SEARCH, BR-17 | 0300433 |
| 2 | Soxta maket raqamlarini talab qilgan testlar o'rniga tuzilma va qoida testlari | BR-19 | 47c4054 |
| 3 | Alembic baseline (0001), Makefile, GitHub CI, ruff/mypy/eslint toza, keraksiz kod va paketlar olib tashlandi | FR-OPS-01 | 9ce732e, 53ac845 |
| 4 | Ariza holatini kuzatish (5 bosqich, tarix), qaror bo'yicha Telegram xabar | FR-APP-STATUS | ff8233d |
| 5 | Usta portfoliosi (ustoz tasdig'idan keyin ochiq), ish beruvchi baholari profilda | FR-PORTFOLIO, BR-20 | de43884 |
| 6 | Ish beruvchi so'rovi (joy, muddat, maosh, shartlar), tushuntiriladigan nomzod tavsiyasi, taklif | FR-MATCH, BR-17 | 840ce8e |
| 7 | QR kodli PDF sertifikat (kirill harflari bilan) | FR-CERT-PDF | 16e4aaf |
| 8 | Lug'at: kunlik seriya, maqsad, haftalik grafik, guruh reytingi, talaffuz; migratsiya 0002 | FR-VOCAB-STREAK | 2773dd7 |
| 9 | 404, xato va yuklanish sahifalari, mobil pastki menyu, nol qiymatlar "—" | UX | d056e3d |
| 10 | Ommaviy sahifalar matni `messages/*.json` ga (4 til); "AI" da'vosi olib tashlandi; faqat imzolangan hamkorlar | CLAUDE.md §6, §8, BR-15 | aaeaf3d |
| 11 | So'rovlar cheklovi (IP va foydalanuvchi bo'yicha), production'da demo yuklanmaydi, nginx xavfsizlik sarlavhalari | NFR-SEC | 106a77f |
| 12 | WCAG AA rang kontrasti, "asosiy kontentga o'tish" havolasi | NFR-A11Y | 3eae3e7 |

## Testlar

- API: 54 ta test o'tadi, 1 tasi o'tkazib yuboriladi (demo bazada yashirin familiyali usta yo'q).
- Web: 15 ta test o'tadi; `tsc`, `eslint` toza.
- CI: oxirgi tekshirilgan yuklashlar yashil.

## Qulaylik (a11y)

Tashqi axe-core kutubxonasi ishlatilmadi (tashqi kodni sahifaga yuklash ruxsat etilmadi). Buning o'rniga:
- asosiy rang juftliklarining kontrasti hisoblandi va hammasi ≥ 4.5:1 ga yetkazildi;
- `lang`, rasm `alt`, tugma/havola nomi, maydon yorlig'i sahifa ichida tekshirildi — muammo topilmadi;
- klaviatura uchun birinchi Tab — "Asosiy kontentga o'tish".

To'liq axe/Lighthouse o'lchovi hali qilinmagan.

## Nima qilinmadi va nima uchun

1. **Qorong'i rejim.** Bitta `navy-900` tokeni ham matn, ham fon rangi sifatida ishlatiladi; avval ularni alohida tokenlarga ajratish kerak.
2. **Kabinet ichki sahifalari matnlari** (ishlar, mahsulotlar, imtihon, arizalar, hisobot va boshqalar) hali kodda o'zbekcha.
3. **Ma'lumotnoma va demo ma'lumotni ajratish.** `seed_portal` kasblar va demo foydalanuvchilarni birga yuklaydi. Production'da demo endi o'chiq, lekin kasblar, tillar va boshqa ma'lumotnomani alohida migratsiyaga ko'chirmaguncha production bazasi bo'sh bo'ladi.
4. **Haqiqiy SMS, domen, HTTPS, zaxira nusxa, monitoring, pentest** — buyurtmachining hisob ma'lumotlari va serveri kerak.
5. **Lighthouse/axe to'liq o'lchovi** — yuqoridagi sababga ko'ra.

## Buyurtmachiga savollar

1. Production serveri qayerda bo'ladi (domen, server, SMS provayderi)?
2. Telegram bot tokeni qachon beriladi (ariza xabarlari shunda haqiqatan yuboriladi)?
3. GitHub repozitoriysi hozir ochiq (public) — yopiq qilishni tasdiqlaysizmi?
