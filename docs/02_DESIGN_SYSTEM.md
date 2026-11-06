# 02. Dizayn tizimi

## 1. Dizayn tamoyillari

1. **Ishonch birinchi o'rinda.** Davlat portali darajasidagi tartib: aniq ierarxiya, holatlar matn bilan beriladi, da'vo qilinmaydi.
2. **Zamonaviy, lekin bezaksiz.** Toza tipografiya, keng bo'sh joy, mazmunli animatsiya. Ortiqcha effekt ishlatilmaydi.
3. **Telefon uchun loyihalanadi.** Ustoz obyektda bir qo'l bilan ishlaydi. Arzon Android va zaif 4G asosiy holat hisoblanadi.
4. **Real Uychi.** Rasmlar Uychidagi real joylar suratlari bo'ladi, stok rasm ishlatilmaydi.
5. **Bitta tizim.** Ommaviy portal va kabinetlar bir xil komponentlardan quriladi, faqat zichligi farq qiladi.

**Namunalar (uslub uchun, nusxa ko'chirish uchun emas):** GOV.UK Design System (tuzilma va qulaylik), Stripe Dashboard (kabinet zichligi), Linear (harakat va tezlik), Apple'ning mahsulot sahifalari (bosh ekrandagi 3D hikoya). my.gov.uz uslubidan xizmatlar kartochkalari va qidiruvni birinchi o'ringa qo'yish g'oyasi olinadi.

## 2. Rang tokenlari

### 2.1. Asosiy palitra
```css
:root {
  /* brend */
  --navy-900:#0C1B33; --navy-800:#13294B; --navy-700:#1C3A66;
  --blue-700:#1D4F8A; --blue-600:#2563A8; --blue-500:#3B7BC4; --blue-100:#E7EEF7; --blue-50:#F2F6FB;
  --teal-700:#225E52; --teal-600:#2F7D6D; --teal-100:#E4F1EE;
  --amber-600:#C27A00; --amber-100:#FFF3D6;   /* qurilish aksenti, kam ishlatiladi */

  /* neytral */
  --ink-900:#0F172A; --ink-800:#1E293B; --ink-600:#475467; --ink-500:#5F6B7D; --ink-400:#98A2B3;
  --line-200:#D9DFE8; --line-100:#EAEEF3;
  --surface-0:#FFFFFF; --surface-50:#F4F6F9; --surface-100:#E9EDF2;

  /* semantik */
  --success-600:#1F8A4C; --success-100:#E3F4EA;
  --warning-600:#B26B00; --warning-100:#FFF1D6;
  --danger-600:#B42318;  --danger-100:#FDE7E5;
  --info-600:#2563A8;    --info-100:#E7EEF7;

  /* rollar */
  --bg: var(--surface-50); --card: var(--surface-0); --text: var(--ink-800);
  --text-muted: var(--ink-500); --border: var(--line-200);
  --primary: var(--blue-600); --primary-hover: var(--blue-700); --primary-contrast:#FFFFFF;
  --focus-ring: 0 0 0 3px rgba(37,99,168,.35);
}
[data-theme="dark"] {
  --bg:#0B1220; --card:#111A2C; --text:#E6EAF0; --text-muted:#9AA6B8; --border:#22304A;
  --primary:#5B9BE0; --primary-hover:#7BB0E8;
}
```

### 2.2. Rang qoidalari
- Matn va fon kontrasti: oddiy matn uchun ≥ **4,5:1**, katta matn va ikonkalar uchun ≥ **3:1** (WCAG 2.2 AA). CI'da avtomatik tekshiriladi.
- Kartochka foni to'liq rangli (`--card`) bo'ladi. **Shaffof va blur (glassmorphism) effektlari ishlatilmaydi.**
- Holat belgilari doim **ikonka + matn + rang** bilan beriladi. Faqat rangga tayanish mumkin emas.
- `--amber` faqat qurilishga oid aksentlar uchun (masalan, "obyektda" belgisi). Bir ekranda 1–2 joydan ko'p ishlatilmaydi.
- Qorong'i rejim **[S]**: kabinetlarda ixtiyoriy, ommaviy portalda 2-to'lqinda.

### 2.3. Holatlar ranglari
| Holat | Fon | Matn | Ikonka |
|---|---|---|---|
| Haqiqiy / Imzolangan / Tayyor | `--success-100` | `--success-600` | `check-circle` |
| Kutilmoqda / Muzokara | `--warning-100` | `--warning-600` | `clock` |
| Bekor qilingan / Xato | `--danger-100` | `--danger-600` | `x-circle` |
| Ma'lumot / Rejalashtirilgan | `--surface-100` | `--ink-600` | `circle-dashed` |

## 3. Tipografiya

- Shrift: **Inter** (variable, `wght 400–700`, kirill va lotin), o'z serverdan beriladi (`woff2`, subset). Arab tili uchun **Noto Sans Arabic**, yapon tili uchun **Noto Sans JP** (faqat shu tillar tanlanganda yuklanadi).
- Raqamlar: `font-feature-settings: "tnum" 1, "cv11" 1;`

| Token | O'lcham / qator balandligi | Og'irlik | Qayerda |
|---|---|---|---|
| `display-xl` | 56 / 64 (mobil 36 / 44) | 700 | Hero sarlavhasi |
| `display-lg` | 44 / 52 (mobil 30 / 38) | 700 | Bo'lim sarlavhalari (portal) |
| `h1` | 32 / 40 (mobil 26 / 34) | 700 | Sahifa sarlavhasi |
| `h2` | 24 / 32 | 600 | Blok sarlavhasi |
| `h3` | 20 / 28 | 600 | Kartochka sarlavhasi |
| `body-lg` | 18 / 28 | 400 | Portal matni |
| `body` | 16 / 24 | 400 | Asosiy matn (16 dan kichik bo'lmaydi) |
| `body-sm` | 14 / 20 | 400 | Jadval, yordamchi matn |
| `caption` | 12 / 16 | 500 | Belgilar, metadata |
| `stat` | 40 / 44 | 700, tnum | KPI raqamlari |

Bitta matn qatorining eng ko'p uzunligi: **72 belgi**.

## 4. Bo'shliq, to'r, shakl

- Bo'shliq shkalasi (4 px asosida): `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`.
- To'r: 12 ustun, oraliq (gutter) 24 px, konteyner eng ko'pi 1200 px (portal) / 1440 px (kabinet).
- Breakpointlar: `sm 360`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.
- Burchak radiuslari: `--r-sm 8px` (input, belgi), `--r-md 12px` (kartochka), `--r-lg 20px` (hero kartochkalar), `--r-full`.
- Soyalar:
  - `--sh-1: 0 1px 2px rgba(12,27,51,.06)`
  - `--sh-2: 0 1px 2px rgba(12,27,51,.06), 0 6px 20px rgba(12,27,51,.06)`
  - `--sh-3: 0 12px 40px rgba(12,27,51,.12)` (modal)
- Teginish nuqtasi: eng kamida **44×44 px**. Ustoz ekranlarida **56 px**.

## 5. Ikonkalar va illyustratsiyalar

- Ikonkalar: **Lucide**, chiziq qalinligi 1,75, o'lchami 16/20/24.
- Har bir kasb uchun maxsus piktogramma to'plami yaratiladi (12 ta, bir xil uslubda, SVG).
- Illyustratsiyalar faqat real rasm yo'q joyda ishlatiladi: izometrik, `navy`, `blue` va `teal` ranglarida, odam yuzisiz.

## 6. Harakat (motion)

| Token | Davomiyligi | Egri chiziq | Qayerda |
|---|---|---|---|
| `--m-fast` | 120 ms | `cubic-bezier(.2,0,0,1)` | hover, bosish |
| `--m-base` | 200 ms | `cubic-bezier(.2,0,0,1)` | ochilish, tab |
| `--m-slow` | 320 ms | `cubic-bezier(.16,1,.3,1)` | modal, drawer |
| `--m-story` | 600–1200 ms | `cubic-bezier(.16,1,.3,1)` | portaldagi scroll-hikoya |

- `prefers-reduced-motion: reduce` yoqilgan bo'lsa, barcha animatsiyalar 0 ms bo'ladi va 3D o'rniga statik rasm chiqadi.
- Kabinetlarda dekorativ animatsiya ishlatilmaydi. Faqat holat o'zgarishi animatsiya qilinadi.
- Sahifalar orasidagi o'tish: View Transitions API (qo'llab-quvvatlansa).

## 7. Komponentlar

Asos: **shadcn/ui** (Radix primitivlari), tokenlarga moslashtiriladi. Har bir komponent Storybook'da barcha holatlari bilan ko'rsatiladi.

| Komponent | Variantlar | Majburiy holatlar |
|---|---|---|
| Button | primary, secondary, ghost, danger, link; sm/md/lg | default, hover, active, focus, disabled, loading |
| Input, Textarea, Select, Combobox | — | default, focus, filled, error (xabar bilan), disabled, read-only |
| PhoneInput | `+998` maska | to'g'ri, noto'g'ri |
| OTPInput | 6 katak, avtomatik o'tish, SMS/Telegram'dan qo'yish | — |
| Checkbox, Radio, Switch | — | — |
| DatePicker | o'zbek lokali, hafta dushanbadan boshlanadi | — |
| FileUpload | drag&drop, kamera (mobil), progress, oldindan ko'rish | yuklanmoqda, xato, juda katta |
| Card | default, interactive, stat, service | hover (interactive) |
| ServiceCard | ikonka + sarlavha + 1 qator matn + strelka | — |
| StatusBadge | 2.3 dagi 4 holat | — |
| Table (DataTable) | saralash, filtr, pagination, ustun tanlash, eksport | bo'sh, yuklanmoqda (skeleton), xato |
| EmptyState | ikonka + sarlavha + izoh + harakat tugmasi | — |
| Skeleton | matn, kartochka, jadval | — |
| Toast | success, error, info | — |
| Dialog, Drawer, Sheet | mobil qurilmalarda Dialog o'rniga Sheet ochiladi | — |
| Tabs, SegmentedControl | — | — |
| Stepper | ariza formasi uchun | — |
| Timeline | ariza va sertifikat tarixi | — |
| KanbanBoard | so'rovlar uchun, sudrab o'tkazish + klaviatura bilan boshqarish | — |
| Map | Leaflet, klaster, popup kartochka | — |
| BeforeAfterSlider | obyekt rasmlari | — |
| WorkerCard | rasm/avatar, ism, kasb, daraja, tillar, reyting, bandlik | — |
| PassportCard | QR pasport ko'rinishi | — |
| VocabCard | aylanuvchi kartochka, audio tugmasi | — |
| AttendanceSheet | ustoz uchun: guruh ro'yxati, katta toggle'lar | oflayn, sinxronlanmoqda, yuborildi |
| LanguageSwitcher, RoleSwitcher | — | — |
| CommandPalette | kabinetda `Ctrl+K` | — |
| OfflineBanner | "Internet yo'q. Ma'lumot saqlanadi va keyin yuboriladi" | — |

**Komponentlar uchun umumiy qoidalar:**
- Har bir interaktiv elementda ko'rinadigan fokus halqasi (`--focus-ring`) bor.
- Har bir ma'lumot ko'rsatadigan blokda 4 holat bo'ladi: **yuklanmoqda / bo'sh / xato / ma'lumot**.
- Xato xabari nima bo'lganini va nima qilish kerakligini aytadi. Masalan: "Telefon raqami 9 ta raqamdan iborat bo'lishi kerak", "Xato yuz berdi" emas.
- Qaytarib bo'lmaydigan harakatlar (sertifikatni bekor qilish, o'chirish) tasdiqlash dialogi bilan bajariladi va sabab so'raladi.

## 8. Sahifa maketlari (wireframe)

### 8.1. Bosh sahifa (desktop)
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] UYCHI BINOKOR   Loyiha  Kasblar  Ustalar  Obyektlar  Materiallar│
│                                         O'z▾   [Ish beruvchilar] [Kirish]│
├──────────────────────────────────────────────────────────────────────┤
│  HERO (balandligi 88vh)                         ┌──────────────────┐ │
│  "Uychida usta tayyorlaymiz —                  │   3D SAHNA        │ │
│   ichki bozor va xorij uchun"                   │ (bino quriladi,   │ │
│  1 qator izoh                                   │  scroll bilan)    │ │
│  ┌────────────────────────────────────────┐    └──────────────────┘ │
│  │ 🔍 Usta, sertifikat raqami yoki material│ [Qidirish]             │
│  └────────────────────────────────────────┘                         │
│  [O'qishga ariza berish]  [Usta topish]                              │
├──────────────────────────────────────────────────────────────────────┤
│  XIZMATLAR  (3×2 ServiceCard)                                        │
│  [Ariza] [Sertifikatni tekshirish] [Usta buyurtma] [Brigada so'rash] │
│  [Materiallar] [Obyektlar]                                           │
├──────────────────────────────────────────────────────────────────────┤
│  RAQAMLAR (jonli): Tinglovchilar · Sertifikatlangan · Ishda · Obyektlar│
├──────────────────────────────────────────────────────────────────────┤
│  MODEL: Mahalla → O'qish → Sertifikat → Ish (scroll-hikoya)          │
├──────────────────────────────────────────────────────────────────────┤
│  BALANS TAMOYILI  2×2:  Til bor/yo'q × Hunar bor/yo'q → yo'l         │
├──────────────────────────────────────────────────────────────────────┤
│  KASBLAR (gorizontal scroll, 12 kartochka: piktogramma, muddat)      │
├──────────────────────────────────────────────────────────────────────┤
│  YANGILANGAN UYCHI (real rasmlar, masonry + oldin/keyin)             │
├──────────────────────────────────────────────────────────────────────┤
│  XORIJIY YO'NALISHLAR (globus: Uychi → DE, JP, KR, SA, AE, TR)       │
├──────────────────────────────────────────────────────────────────────┤
│  HAMKORLAR (logotiplar + holat belgilari)                            │
├──────────────────────────────────────────────────────────────────────┤
│  FOOTER: hamkorlar · aloqa · ishonch telefoni · maxfiylik · tillar   │
└──────────────────────────────────────────────────────────────────────┘
```
Mobil ko'rinishda 3D sahna sarlavha ostiga 56vh balandlikda tushadi. Qidiruv qatori 3D'dan oldin turadi. Xizmatlar 2 ustunda joylashadi.

### 8.2. Sertifikatni tekshirish `/verify/UB-2026-000123` (mobil)
```
┌──────────────────────────────┐
│ [Logo]                O'z ▾  │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ ✅  HAQIQIY SERTIFIKAT    │ │  ← success-100 fon, katta
│ │ № UB-2026-000123          │ │
│ │ Raqamli imzo tekshirildi  │ │
│ └──────────────────────────┘ │
│  [Rasm]  Aziz Karimov        │
│          Santexnik · Usta    │
│          ★ 4,8 (12 baho)     │
│  ── Sertifikatlar ────────── │
│  ✅ UYCHI BINOKOR + NamDTU    │
│     2027-03-15               │
│  ✅ Davlat malaka sertifikati │
│     Reyestr ↗                │
│  ── Tajriba ──────────────── │
│  1 240 soat (tasdiqlangan)   │
│  ── Tillar ───────────────── │
│  Nemis: 820 / 1000 so'z      │
│  ── Portfolio (rasmlar) ──── │
│  [▢][▢][▢]                   │
│  Holat: 🟢 Bo'sh              │
│ [ Ushbu ustani so'rash ]     │  ← sticky pastki tugma
│  PDF yuklab olish            │
└──────────────────────────────┘
```

### 8.3. Ustozning davomat ekrani (mobil, bir qo'l bilan)
```
┌──────────────────────────────┐
│ ← Santexnik-03 · Bugun       │
│ 📍 Obyekt: 12-maktab          │
│ [ ✓ Hammasi keldi ]  (56px)  │
├──────────────────────────────┤
│ Aziz K.          [Keldi ●  ] │  ← katta toggle
│ Bobur T.         [Keldi ●  ] │
│ Davron S.        [  ○ Yo'q ] │ → sabab: Kasal / Sababsiz
│ ... (10 tagacha)             │
├──────────────────────────────┤
│ Obyekt soati:  [ − ] 6 [ + ] │
├──────────────────────────────┤
│ ⚠ Internet yo'q — saqlandi    │  ← OfflineBanner
│ [      Yuborish       ]      │
└──────────────────────────────┘
```

### 8.4. Admin boshqaruv paneli (desktop)
```
┌────────┬─────────────────────────────────────────────────────┐
│ Sidebar│ Boshqaruv paneli          [Davr ▾] [Mahalla ▾] [⤓]  │
│ Panel  ├─────────────────────────────────────────────────────┤
│ Arizalar│ KPI: Qabul 412 · Tamomladi 86% · Ishda 71% · ...    │
│ Kurslar├─────────────────────────────────────────────────────┤
│ Guruhlar│ VORONKA (gorizontal)          │ SERTIFIKAT NAVBATI  │
│ Sertif. │ 1 200 → 830 → 760 → 410 → 290 │ 14 ta kutmoqda [→]  │
│ Ustalar├─────────────────────────────────┼─────────────────────┤
│ Brigada│ KASBLAR BO'YICHA (bar)           │ SO'ROVLAR SLA       │
│ So'rovlar│                               │ 3 ta muddati o'tdi  │
│ Obyektlar├────────────────────────────────┴─────────────────────┤
│ Material│ OGOHLANTIRISHLAR: 3 kun kelmaganlar (17) [→]          │
│ Hamkorlar│                                                     │
│ Kontent │                                                      │
│ Hisobot │                                                      │
│ Sozlama │                                                      │
└────────┴─────────────────────────────────────────────────────┘
```

### 8.5. Boshqa sahifalar uchun shablonlar
| Shablon | Tuzilishi | Qayerda |
|---|---|---|
| **List + Filter** | chapda filtrlar (mobilda Sheet), o'ngda kartochkalar yoki jadval, yuqorida qidiruv va saralash | Ustalar, materiallar, obyektlar, arizalar |
| **Detail** | sarlavha + holat + asosiy harakat; tablar: Umumiy / Tarix / Hujjatlar | Usta, obyekt, ariza, so'rov |
| **Wizard** | Stepper, har qadamda 1–3 maydon, "Orqaga / Davom etish", qoralama saqlanadi | Ariza, so'rov, brigada tuzish |
| **Kanban** | ustunlar = holatlar, kartochkada SLA hisoblagichi | So'rovlar |
| **Story** (portal) | to'liq ekranli bo'limlar, scroll bilan boshqariladigan animatsiya | Bosh sahifa, Loyiha |

## 9. 3D va media

### 9.1. 3D sahnalar (react-three-fiber)
| Sahna | Joyi | Tavsif | Byudjet |
|---|---|---|---|
| Bino qurilishi | Hero | Poydevor → karkas → g'isht → tom → oyna. Scroll bilan boshqariladi | ≤ 1,5 MB (glTF + Draco + KTX2), ≤ 60k uchburchak |
| Kasb sahnalari ×12 | `/kasblar/[code]` | Har bir kasbning asosiy harakati, 6–10 soniyalik halqa | Har biri ≤ 800 KB |
| Globus | Yo'nalishlar | Uychidan 6 davlatga yoylar | ≤ 400 KB |

**Qoidalar:**
- Sahnalar lazy yuklanadi (`IntersectionObserver`). Ularning o'rnida avval poster (AVIF) ko'rsatiladi, LCP shu poster bo'yicha o'lchanadi.
- Quyidagi holatlarda 3D o'rniga poster va qisqa video (WebM/MP4, ≤ 1,2 MB) ko'rsatiladi: `hardwareConcurrency < 4`, `deviceMemory < 4`, WebGL2 yo'q, `saveData`, `prefers-reduced-motion`.
- Kadrlar tezligi 30 fps dan tushsa, sifat avtomatik pasaytiriladi (`PerformanceMonitor`).
- Uslub low-poly, materiallar matovaya. Ranglar brend palitrasidan olinadi, odam figuralari stilizatsiya qilinadi.

### 9.2. Rasmlar
- Format: AVIF va WebP, `srcset` bilan (360/768/1280/1920). Next/Image orqali, `blurDataURL` bilan beriladi.
- Real Uychi rasmlari: kamida 30 ta, gorizontal 3:2, 4000 px dan katta original, yuz va avtomobil raqamlari xiralashtirilgan.
- Har bir rasmda alt-matn (4 tilda), manba va sana bo'ladi.

## 10. Matn uslubi (UX copy)

- "Siz" murojaati, faol nisbat, qisqa jumlalar (15 so'zgacha).
- Tugmalar fe'l bilan yoziladi: "Ariza berish", "Yuborish", "Sertifikatni tekshirish". "OK" yoki "Bosing" yozilmaydi.
- Raqamlar: `1 240` (bo'shliq bilan), sana `15.03.2027`, pul `5 000 000 so'm`.
- Taqiqlangan iboralar: "dunyoda birinchi", "yagona", "kafolatlangan ish" (o'rniga "ishga joylashishda ko'mak"), "homiy".
- Lotin va kirill yozuvlari: interfeys tanlangan yozuvda to'liq ko'rsatiladi, aralashtirilmaydi.

## 11. Qulaylik (WCAG 2.2 AA)

- Klaviatura bilan to'liq boshqarish, mantiqiy fokus tartibi, "Asosiy kontentga o'tish" havolasi.
- Semantik HTML, landmarklar, ARIA faqat zarur bo'lganda. Har bir forma maydonida `label` bor.
- Ekran o'quvchi bilan tekshiriladi (NVDA, TalkBack).
- Matnni 200% ga kattalashtirganda tuzilma buzilmaydi. Gorizontal scroll faqat jadvallarda bo'ladi.
- Animatsiya 5 soniyadan uzun bo'lsa, to'xtatish tugmasi bor.
- Arab tilida to'liq RTL (`dir="rtl"`, CSS'da logical properties).
- CI'da `axe-core` tekshiruvi ishlaydi: kritik xatolar soni 0 bo'lishi shart.

## 12. Dizayn bo'yicha topshiriladigan natijalar

| № | Natija | Muddat |
|---|---|---|
| D-1 | Tokenlar (`packages/ui/tokens.css` + `tailwind.config.ts`) | 1-sprint |
| D-2 | Storybook: barcha komponentlar va ularning holatlari | 1–2-sprint |
| D-3 | Bosh sahifa, verify, usta profili, davomat ekrani: yuqori aniqlikdagi prototip, buyurtmachi tasdiqlaydi | 1-sprint (kod yozishdan oldin) |
| D-4 | 12 ta kasb piktogrammasi (SVG) | 2-sprint |
| D-5 | 3D sahnalar (hero, globus, 12 kasb) | 2–4-sprint |
| D-6 | Sertifikat va pasport PDF shablonlari | 3-sprint |

## 13. Taqdimot qatlami

Bosh sahifa to'liq ekran: 72–88px sarlavha (telefonda 40px), harf oralig'i −0.03em. Qorong'i dengiz (`#0C1B33`) va och fon (`#F4F6F9`) almashadi. Qahrabo (`#C27A00`) faqat qurilish urg'usi uchun. Kartochka radiusi 20px, soyasi yengil, shisha va xira effekt yo'q. Harakat: paydo bo'lishda 16px ko'tarilish, raqamlar sanab chiqadi, kartochka hoverda ko'tariladi. `prefers-reduced-motion` da animatsiya o'chadi. 3D bino zaif qurilmada statik chizma bilan almashtiriladi. `public/media/real/` da surat bo'lsa, komponentlar shu suratlarni o'zi oladi.
