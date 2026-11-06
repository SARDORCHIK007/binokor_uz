# UYCHI BINOKOR platformasi — Texnik topshiriq v4 (hujjatlar to'plami)

| Maydon | Qiymat |
|---|---|
| Loyiha | UYCHI BINOKOR — Binokorlar loyihasi (Uychi tumani, Namangan viloyati) |
| Platforma | `uychibinokor.uz` — o'qitish, sertifikatlash, ishga joylashtirish va qurilish bozori platformasi |
| Versiya | 4.0 (2026-yil 6-noyabr). TZ v2 (landing sayt) va v3 (MVP tavsifi) o'rnini bosadi |
| Asos hujjatlar | Loyiha konsepsiyasi (1-hujjat), Amalga oshirish rejasi (2-hujjat, 2026-yil oktabr), loyiha taqdimoti, 2026-yil noyabrdagi 12 ta qo'shimcha |
| Buyurtmachi | UYCHI BINOKOR MChJ (operator), Uychi tumani hokimligi |
| Ishlab chiquvchi | Bitta dasturchi + Claude Code / Cursor (vayb koding) |
| Holat | Muhokama uchun. Yakuniy tasdiq vakolatli shaxslar tomonidan beriladi |

## Hujjatlar tarkibi

| № | Fayl | Mazmuni | Kim uchun |
|---|---|---|---|
| 00 | `00_README.md` | Shu fayl: tarkib, atamalar, ishlatish tartibi | Hamma |
| 01 | `01_PRD.md` | Mahsulot talablari: maqsad, rollar, biznes qoidalari, foydalanuvchi hikoyalari, qabul mezonlari | Buyurtmachi, dasturchi |
| 02 | `02_DESIGN_SYSTEM.md` | Dizayn tizimi: tokenlar, tipografiya, to'r, komponentlar va holatlari, sahifa maketlari, 3D, harakat, qulaylik (WCAG 2.2 AA) | Dasturchi (frontend) |
| 03 | `03_ARCHITECTURE.md` | Arxitektura: stek, modullar, NFR, muhitlar, CI/CD, monitoring, qidiruv, fon vazifalar, PWA/oflayn, i18n | Dasturchi |
| 04 | `04_DATA_MODEL.sql` | To'liq ma'lumotlar bazasi sxemasi (PostgreSQL 16), cheklovlar, indekslar, holat mashinalari | Dasturchi (backend) |
| 05 | `05_API.md` | API shartnomasi: qoidalar, xato formati, pagination, barcha endpointlar va asosiy sxemalar | Dasturchi |
| 06 | `06_SECURITY.md` | Xavfsizlik: tahdidlar modeli (STRIDE), ruxsatlar matritsasi, autentifikatsiya, kriptografiya, shaxsiy ma'lumotlar qonunchiligi, zaxira, pentest | Dasturchi, yurist |
| 07 | `07_AI.md` | SI funksiyalari: nomzod saralash, rezyume generatsiyasi, talaffuz tekshiruvi, rasm tahlili. Hammasi tavsiya xarakterida | Dasturchi |
| 08 | `08_TEST_PLAN.md` | Test strategiyasi, qamrov, qabul testlari, yuklanish testlari | Dasturchi |
| 09 | `09_ROADMAP.md` | Bosqichlar, sprintlar, Claude Code uchun tayyor buyruqlar, ishga tushirishdan oldingi tekshiruv ro'yxati | Dasturchi, buyurtmachi |
| — | `../CLAUDE.md` | Repozitoriy ildizidagi doimiy ko'rsatmalar. Claude Code har sessiyada o'qiydi | Claude Code |

## Claude Code bilan ishlash tartibi

1. Repozitoriy yarating va bu papkani `docs/` ichiga, `CLAUDE.md` ni ildizga joylang.
2. Claude Code'ni ishga tushiring. U `CLAUDE.md` ni avtomatik o'qiydi.
3. `09_ROADMAP.md` dagi buyruqlarni **tartib bilan, bittadan** bering. Har bir sprint oxirida Claude Code qabul mezonlari bo'yicha hisobot beradi.
4. Talab o'zgarsa, avval tegishli hujjatni yangilang, keyin kodni. Hujjat va kod bir-biriga zid bo'lmasligi kerak.

## Muhimlik darajalari

Talablar yonida quyidagi belgilar ishlatiladi:
- **[M]** majburiy (MUST). Bu talabsiz bosqich qabul qilinmaydi.
- **[S]** kerakli (SHOULD). Asosli sabab bo'lsa keyingi bosqichga o'tkazilishi mumkin.
- **[C]** ixtiyoriy (COULD).

Har bir talab identifikatorga ega (masalan, `FR-CERT-04`, `NFR-PERF-02`, `SEC-AUTH-03`). Test va commit xabarlarida shu identifikatorlarga havola qilinadi.

## Atamalar lug'ati

| Atama | Ma'nosi |
|---|---|
| Tinglovchi (talaba) | O'qishga qabul qilingan shaxs |
| Ustoz | Amaliy mashg'ulotlarni olib boradigan tajribali usta. Bitta ustozga ko'pi bilan 10 ta tinglovchi biriktiriladi |
| Kurator | Chet tilini biladigan tinglovchi yoki OTM bitiruvchisi. 8–10 tinglovchining til o'rganishi va faolligini kuzatadi |
| Brigada | 1 boshliq (til biladi) va 8–10 sertifikatlangan ustadan iborat, bitta kasb bo'yicha tuzilgan jamoa |
| Ichki trek | Ichki bozor uchun 3–6 oylik o'qish. Til o'rgatilmaydi |
| Tashqi trek | Xorijiy bozor uchun 6–12 oylik o'qish: kasb yadrosi + til moduli |
| Balans matritsasi | Arizachini til va kasb bo'yicha 4 toifaga (A/B/C/D) ajratish |
| QR ishchi pasporti | Ustaning ochiq raqamli profili: sertifikatlar, soatlar, tillar, baholar |
| Talab (so'rov) | Ish beruvchining usta yoki brigada uchun buyurtmasi |
| Agentlik | Tashqi mehnat migratsiyasi agentligi yoki uning litsenziyali hamkori |
| Vaucher | Bandlik organlari tomonidan o'qish xarajatini qoplash mexanizmi |
| NFR | Funksional bo'lmagan talab: tezlik, ishonchlilik, xavfsizlik |
| RPO / RTO | Ma'lumot yo'qotilishiga yo'l qo'yiladigan eng ko'p muddat / tizimni tiklash muddati |

## O'zgarishlar tarixi

| Versiya | Sana | O'zgarish |
|---|---|---|
| 2.0 | 2026-10 | Landing sayt: 3D sahnalar, matnlar |
| 3.0 | 2026-11-06 | To'liq platforma, noyabrdagi 12 ta qo'shimcha |
| 4.0 | 2026-11-06 | Hujjatlar to'plami. Qo'shildi: dizayn tizimi, arxitektura va NFR, to'liq ma'lumotlar sxemasi, API shartnomasi, xavfsizlik, SI, test rejasi, yo'l xaritasi |
