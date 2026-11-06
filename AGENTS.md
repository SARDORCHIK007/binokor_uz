# CLAUDE.md — UYCHI BINOKOR platformasi

Bu repozitoriy UYCHI BINOKOR platformasining kodi. Talablar `docs/` papkasida. Ish boshlashdan oldin `docs/00_README.md` faylini va joriy sprint uchun tegishli hujjatlarni o'qi.

## Asosiy qoidalar
1. **Hujjat — manba.** Kod `docs/` dagi talablarga zid bo'lmasligi kerak. Ziddiyat yoki noaniqlik topsang, kodni o'zing taxmin qilib yozma: `docs/reports/questions.md` fayliga yoz va hisobotda ko'rsat.
2. **Bir vaqtda bitta sprint.** `docs/09_ROADMAP.md` dagi joriy sprint doirasidan chiqma.
3. **Har bir talab — test bilan.** Commit va testlarda talab identifikatorini ko'rsat (`FR-CERT-04`, `BR-01`).
4. **Biznes qoidalari backend'da.** BR-01 (guruhda ≤10 va ustozning barcha guruhlarida faol tinglovchilar ≤10), BR-02 (≤10; 8 dan kam — ogohlantirish), BR-07 (a'zo ≤10; READY da 8–10), BR-14, BR-15, BR-17 va BR-18 faqat frontend'da tekshirilsa, bu xato hisoblanadi.
5. **Shaxsiy ma'lumot:** loglarga yozilmaydi, tashqi servislarga yuborilmaydi (SI faqat `modules/ai/anonymizer.py` orqali), ochiq javoblarda telefon, JShShIR, pasport va manzil qaytarilmaydi.
6. **Matnlar** faqat `apps/web/messages/*.json` faylida bo'ladi. Kod ichida interfeys matni yozilmaydi. Asosiy til `uz-Latn`.
7. **Dizayn:** faqat `packages/ui` tokenlari va komponentlari ishlatiladi. Shaffof yoki blur kartochkalar qilinmaydi. Har bir ma'lumot blokida 4 holat bo'ladi: yuklanmoqda / bo'sh / xato / ma'lumot.
8. **Taqiqlar:** "homiy" so'zi; "dunyoda birinchi" yoki "yagona" kabi da'volar; bazada yo'q statistika; stok rasmlar; ish izlovchidan to'lov olish; ruxsatsiz logotip.

## Buyruqlar
```
make up            # barcha servislar
make test          # backend + frontend testlari
make e2e           # Playwright
make lint          # ruff, mypy, eslint, tsc
make migrate       # alembic upgrade head
make seed-demo     # demo ma'lumotlar
make api-client    # OpenAPI'dan TS klient yaratish
```

## Kod uslubi
- Python: Ruff + mypy strict. Modul tuzilmasi `models.py`, `schemas.py`, `service.py`, `policy.py`, `router.py`. Modullar bir-birining jadvallariga to'g'ridan-to'g'ri murojaat qilmaydi.
- TypeScript strict. Server Components standart holat; `"use client"` faqat zarur bo'lganda.
- API xatolari RFC 9457 formatida, `docs/05_API.md` §2 dagi kodlar bilan qaytariladi.
- Migratsiyalar qaytariladigan (`downgrade`) bo'lishi shart.

## Sprint oxirida
`docs/reports/sprint-N.md` fayliga yoz: nima qilindi (talab identifikatorlari bilan), test, Lighthouse va axe natijalari, nima qilinmadi va nima uchun, buyurtmachiga savollar.
