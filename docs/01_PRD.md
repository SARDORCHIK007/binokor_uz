# 01. Mahsulot talablari (PRD)

## 1. Maqsad va muammo

**Muammo.**
- Uychi tumanidagi yoshlar, ayniqsa ijtimoiy reyestrdagi oilalar farzandlari, amaliy kasb va barqaror daromadga ega emas.
- Qurilish kompaniyalari malakali usta topa olmaydi.
- Xorijiy ish beruvchilar uchun o'zbek ustasining malakasini tekshirishning ishonchli raqamli usuli yo'q.
- Til biladigan OTM bitiruvchilari ish topa olmaydi, kasb egalari esa til bilmaydi.

**Platformaning maqsadi.** Tinglovchining mahalladan ish joyigacha bo'lgan butun yo'li bitta tizimda yuritiladi. Har bir bosqich tasdiqlanadi va har bir usta malakasi QR orqali tekshiriladigan raqamli pasportga ega bo'ladi.

**Qiymat taklifi:**

| Kim | Platforma nima beradi |
|---|---|
| Yosh / arizachi | Ariza berish, bepul o'qish yo'li, holatni kuzatish, sertifikat, ish takliflari |
| Usta | Tasdiqlangan profil, buyurtmalar, xorijga chiqish yo'li |
| Ichki ish beruvchi | Malakasi tasdiqlangan usta va brigadani tez topish |
| Xorijiy ish beruvchi | Ingliz, nemis va arab tillaridagi tekshiriladigan nomzodlar bazasi, brigada buyurtmasi |
| Ishlab chiqaruvchi | Uychi materiallarini sotish kanali |
| Hokimlik, Bandlik organlari | Vaucher natijalari va bandlik ko'rsatkichlari bo'yicha shaffof hisobot |

## 2. Muvaffaqiyat ko'rsatkichlari (2-hujjat, 12-bo'lim asosida)

| ID | Ko'rsatkich | Pilot maqsadi | O'lchash manbai |
|---|---|---|---|
| KPI-01 | Qabul qilinganlar | 700–800 nafar | `enrollments` |
| KPI-02 | Kursni tamomlaganlar | ≥ 85% | `enrollments.status = COMPLETED` |
| KPI-03 | 3 oy ichida ishga joylashganlar | ≥ 70% | `placements` |
| KPI-04 | Davlat malaka sertifikati olganlar | ≥ 60% (talabga javob berganlardan) | `certificates.issuer = STATE` |
| KPI-05 | Ish beruvchilarning o'rtacha bahosi | ≥ 4,0 / 5 | `reviews` |
| KPI-06 | QR pasportga ega bitiruvchilar | 100% | `worker_profiles` |
| KPI-07 | Tashqi trekda lug'atni ≥ 80% o'zlashtirganlar | ≥ 75% | `vocab_progress` |
| KPI-08 | Ish beruvchi so'roviga birinchi javob muddati | ≤ 1 ish kuni | `demand_requests` |

Bu ko'rsatkichlar admin boshqaruv panelida va hamkorlar hisobotida jonli ko'rinadi.

## 3. Qamrov

**Kiradi:** ommaviy portal; ariza va tanlov; o'quv tizimi; kuratorlar; lug'at moduli; sertifikatlash va QR pasport; usta katalogi; brigadalar; ish beruvchi so'rovlari; ishga joylashtirishni hisobga olish; qurilish obyektlari; qurilish materiallari katalogi; hamkorlar; yangiliklar (CMS); hisobotlar; Telegram bot; SI yordamchi funksiyalari; 4 lokal interfeys (`uz-Latn`, `uz-Cyrl`, `ru`, `en`). Nemis (`de`) va arab (`ar`) tillari faqat `/verify` va ochiq ishchi pasportida.

**Kirmaydi (v1):**
- Online to'lov (to'g'ridan-to'g'ri amalga oshiriladi; Click/Payme 2027-yilda ko'rib chiqiladi).
- Mobil ilovalar App Store / Google Play uchun (o'rniga PWA).
- Buxgalteriya.
- Mehnat shartnomalarini elektron imzolash (hujjat yuklanadi, xolos).
- Xorijga yuborish bo'yicha qaror qabul qilish (bu agentlik vakolati).

## 4. Personalar

| Persona | Tavsif | Qurilma | Asosiy ehtiyoj |
|---|---|---|---|
| **Jasur, 19 yosh** | Ijtimoiy reyestrdagi oila, maktabni bitirgan, ishsiz | Arzon Android, 4G vaqti-vaqti bilan | Oddiy ariza, telefonda o'qish holati |
| **Dilnoza, 23 yosh** | NamDTU nemis tili bitiruvchisi, ish topa olmagan | Android/iPhone | Kasb o'rganish, kurator bo'lish, xorijga brigadir bo'lib chiqish |
| **Rustam aka, 44 yosh** | 20 yillik santexnik, ustoz | O'rta Android, obyektda internet zaif | Davomatni tez kiritish, oflayn ishlash |
| **Kompaniya HR, Toshkent** | 30 kishilik qurilish kompaniyasi | Noutbuk | 10 ta suvoqchini 2 haftada topish |
| **Herr Weber, Germaniya** | Kadrlar agentligi menejeri | Noutbuk, nemis tili | Nomzodlarning malaka va tilini tekshirish |
| **Bandlik bo'limi xodimi** | Hisobotlar | Ish kompyuteri | Vaucher bo'yicha natijalar, Excel |

## 5. Rollar

Batafsil ruxsatlar matritsasi: `06_SECURITY.md`, 4-bo'lim.

`superadmin`, `admin`, `education_lead` (o'quv rahbari), `cert_officer` (sertifikatlash mutaxassisi), `placement_manager`, `coordinator` (mahalla koordinatori), `mentor` (ustoz), `teacher` (NamDTU o'qituvchisi), `curator`, `student`, `worker` (bitiruvchi), `employer_local`, `employer_foreign`, `producer`, `partner_viewer` (Bandlik, hokimlik, agentlik), `vocab_author`, `content_editor`.

Bitta foydalanuvchida bir nechta rol bo'lishi mumkin. Kabinetda rollar o'rtasida almashtirgich (switcher) bo'ladi.

## 6. Biznes qoidalari (BR)

| ID | Qoida |
|---|---|
| BR-01 | Bitta guruhda ko'pi bilan **10** tinglovchi va bitta ustozning barcha guruhlaridagi faol tinglovchilar jami ko'pi bilan **10**. Ikkala cheklov ham bazadagi triggerda tekshiriladi |
| BR-02 | Kurator guruhi **8–10** tinglovchidan iborat. 8 tadan kam bo'lsa ogohlantirish chiqadi (cheklov emas). 10 tadan oshirish trigger bilan to'siladi |
| BR-03 | Ichki trek kursining muddati **3–6 oy**, til moduli bo'lmaydi |
| BR-04 | Tashqi trekning muddati **6–12 oy** (kasb yadrosi + til moduli). Til moduli faqat tashqi trekda bo'ladi |
| BR-05 | O'quv vaqti taqsimoti: ≈ 20% nazariya, ≈ 30% ustaxona, ≈ 50% obyekt. Kurs uchun ±5% og'ishga ruxsat bor. `SAFETY` moduli soatlari nazariya soatlari ichida hisoblanadi |
| BR-06 | Balans matritsasi: A (kasbi bor, tili yo'q) → til; B (tili bor ≥ B1, kasbi yo'q) → faqat sertifikatlangan kasb, kurator yoki brigadir; C (ikkalasi yo'q) → ichki trek; D (ikkalasi bor) → tezlashtirilgan yo'l. Toifani tizim taklif qiladi, admin tasdiqlaydi |
| BR-07 | Brigada: 1 boshliq (amaldagi sertifikat + til hujjati yoki B1 dan past bo'lmagan daraja) + 8–10 a'zo, bitta kasb bo'yicha. A'zolar soni 10 dan oshmaydi (trigger). `READY` ga o'tishda a'zolar soni 8–10 bo'lishi shart (servis va holat triggeri) |
| BR-08 | Brigada `READY` holatiga o'tish shartlari: barcha a'zolarda amaldagi sertifikat bo'lishi, a'zolarning lug'at progressi (maqsad tili bo'yicha) ≥ 80% bo'lishi, a'zolarda tibbiy ko'rik belgisi bo'lishi |
| BR-09 | Sertifikat qoralamasi shartlari: davomat ≥ 80%; barcha modul topshiriqlaridan o'tgan; yakuniy sinovda nazariy qism ≥ 60, amaliy qism ≥ 70 ball; obyekt soatlari ≥ kurs normasi. Shartlar `courses` sozlamasida o'zgartiriladi |
| BR-10 | Sertifikat 2 ta tasdiqdan keyin chiqariladi: `mentor` va (`education_lead` yoki `cert_officer`). Ikki tasdiqni bitta shaxs bera olmaydi |
| BR-11 | Davlat va xalqaro sertifikatlar platformada chiqarilmaydi, faqat hujjat yoki reyestr havolasi bilan qayd etiladi |
| BR-12 | Usta darajalari: Shogird → Usta yordamchisi → Usta → Brigadir. Tizim darajani taklif qiladi, `admin` oshiradi |
| BR-13 | Ish izlovchidan **hech qanday to'lov olinmaydi** |
| BR-14 | Xorijiy so'rov `NEW` holatida yaratiladi. Agentlik biriktirilsa, o'sha tranzaksiyada `VIA_AGENCY` ga o'tadi. Agentlik bo'lmasa `NEW` da qoladi va menejer biriktiradi. Platforma xorijga yuborish bo'yicha qaror qabul qilmaydi |
| BR-15 | Hamkor logotipi faqat `status = SIGNED` va `logo_permission = true` bo'lganda chiqadi. Boshqa hollarda nomi va holat belgisi ko'rsatiladi |
| BR-16 | Xorijiy tashkilot logotipi sertifikatda faqat tasdiqlangan markaz maqomi bo'lsa turadi. Aks holda matn bilan yoziladi: "X standarti bo'yicha tayyorlangan" |
| BR-17 | Ish beruvchi ustaning telefon raqami va shaxsiy hujjatlarini ko'rmaydi. Aloqa joylashtirish menejeri orqali bo'ladi |
| BR-18 | Ochiq profilda rasm va to'liq ism faqat ustaning alohida roziligi bilan chiqadi. Rozilik bo'lmasa ism "Aziz K." shaklida ko'rsatiladi |
| BR-19 | Bosh sahifadagi barcha statistika bazadan olinadi. Qo'lda kiritilgan raqam ko'rsatilmaydi |
| BR-20 | Sayt rasmlarida Uychidagi bino, yo'l va obyektlar faqat real suratlar bilan ko'rsatiladi (`media.source = REAL_UYCHI`) |
| BR-21 | Kurslar ichki va xorijiy bozor talabi asosida ochiladi. Kurs yaratishda unga asos bo'lgan talablar (so'rovlar, prognoz) ko'rsatiladi |
| BR-22 | Barcha avtomatik hisoblar (toifa, daraja, SI saralash, rasm tahlili) tavsiya hisoblanadi. Qarorni vakolatli xodim qabul qiladi va bu `audit_log`ga yoziladi |
| BR-23 | Sertifikat bekor qilinganda sababi majburiy ko'rsatiladi. Tekshirish sahifasi darhol "Bekor qilingan" holatini ko'rsatadi |
| BR-24 | Material buyurtmasi platformada faqat so'rov sifatida qabul qilinadi. Narx va yetkazib berishni ishlab chiqaruvchi o'zi tasdiqlaydi |
| BR-25 | "Homiy" so'zi ishlatilmaydi, barcha tashkilotlar "hamkor" deb yoziladi. "Dunyoda birinchi" kabi da'volar qilinmaydi |

## 7. Holat mashinalari

### 7.1. Ariza (`applications.status`)
```
DRAFT → SUBMITTED → SCREENING → VOUCHER_CHECK → INTERVIEW → TRIAL (2 hafta) → ACCEPTED → ENROLLED
                         ↘ REJECTED (sabab majburiy)       ↘ WAITLIST
Har qanday holatdan → WITHDRAWN (arizachining o'zi)
```

### 7.2. O'qish (`enrollments.status`)
```
ACTIVE → COMPLETED → (sertifikat)
   ↘ SUSPENDED → ACTIVE
   ↘ DROPPED (sabab majburiy)
   ↘ TRANSFERRED (boshqa guruh yoki trekka)
```

### 7.3. Sertifikat (`certificates.status`)
```
DRAFT (avtomatik) → PENDING_APPROVAL (1/2) → ISSUED (2/2, PDF + imzo) → REVOKED
DRAFT → REJECTED (sabab bilan, tinglovchiga xabar boriladi)
ISSUED → EXPIRED (faqat tashqi sertifikat: issuer STATE yoki INTERNATIONAL, valid_until o'tganda)
```

### 7.4. Ish beruvchi so'rovi (`demand_requests.status`)
```
NEW → IN_REVIEW → SHORTLIST_SENT → EMPLOYER_APPROVED → CONTRACTING → MATCHED → CLOSED
XORIJIY: NEW → VIA_AGENCY (agentlik shu tranzaksiyada biriktirilsa) → (agentlik javobi) → SHORTLIST_SENT → ...
Agentlik bo'lmasa so'rov NEW da qoladi.
Har qanday holatdan → CANCELLED (sabab bilan)
```

### 7.5. Brigada (`brigades.status`)
```
FORMING → READY (BR-08) → PROPOSED → DEPLOYED → RETURNED / DISBANDED
```

### 7.6. Usta bandligi (`worker_profiles.availability`)
`FREE`, `BUSY` (tugash sanasi bilan), `ABROAD`, `INACTIVE`

## 8. Funksional talablar (FR)

### 8.1. Ommaviy portal (PUB)
| ID | Talab | Daraja |
|---|---|---|
| FR-PUB-01 | Bosh sahifa bloklari `02_DESIGN_SYSTEM.md` 8.1-bo'limidagi tartibda bo'ladi | M |
| FR-PUB-02 | Yagona qidiruv: usta, material va obyekt bo'yicha. Natijalar turi bo'yicha guruhlanadi, 300 ms ichida chiqadi. So'rov `^UB-\d{4}-\d{6}$` ga mos kelsa, sertifikat indeksdan qidirilmaydi va `/verify/{number}` ga yo'naltiriladi | M |
| FR-PUB-03 | Har bir kasb sahifasida: 3D yoki rasm, ichki va tashqi trek muddatlari, o'quv tuzilmasi, darajalar va maosh oralig'i ("taxminiy" belgisi bilan), ochiq kurslar, "Ariza berish" tugmasi | M |
| FR-PUB-04 | Yo'nalishlar sahifasida har bir davlat bo'yicha: talab qilinadigan til va daraja, majburiy imtihonlar (JFT/JLPT, EPS-TOPIK, SVP va boshqalar), muddat, agentlik orqali ishlash tartibi | M |
| FR-PUB-05 | Hamkorlar sahifasi BR-15 qoidasi bo'yicha, turlarga ajratilgan | M |
| FR-PUB-06 | Obyektlar xaritasi: klaster, holat bo'yicha filtr, oldin/keyin rasmlari slayderi | S |
| FR-PUB-07 | Materiallar katalogi: kategoriya, ishlab chiqaruvchi va narx bo'yicha filtr, buyurtma so'rovi formasi | S |
| FR-PUB-08 | Yangiliklar: ro'yxat, sahifa, Telegram'ga ulashish, Open Graph | S |
| FR-PUB-09 | `/en` versiya: xorijiy ish beruvchi uchun alohida kirish sahifasi | M (S6) |
| FR-PUB-10 | Har bir ommaviy sahifada SEO meta, `sitemap.xml`, `robots.txt`, schema.org (`Organization`, `EducationalOccupationalCredential`) | M |

### 8.2. Ariza va tanlov (APP)
| ID | Talab | Daraja |
|---|---|---|
| FR-APP-01 | Ariza 3 turda: yosh, usta (malaka oshirish), OTM bitiruvchisi. Bir qadamda bitta savol beriladigan 5–7 qadamli forma, qoralama `applications.draft_data` (jsonb) da avtomatik saqlanadi. `persons` yozuvi faqat topshirishda yaratiladi | M |
| FR-APP-02 | Majburiy rozilik belgilari: shaxsiy ma'lumotlarni qayta ishlash; Telegram orqali xabar olish | M |
| FR-APP-03 | Balans matritsasi bo'yicha toifa avtomatik hisoblanadi (BR-06) va arizachiga tavsiya etilgan yo'l ko'rsatiladi | M |
| FR-APP-04 | Koordinator mahalla ro'yxatini qo'lda yoki Excel orqali kiritadi. Import oldidan dublikatlar telefon va JShShIR bo'yicha tekshiriladi | M |
| FR-APP-05 | Ariza holati kabinetda va Telegram'da ko'rinadi. Har bir holat o'zgarishida xabar yuboriladi | M |
| FR-APP-06 | Vaucher holatini qo'lda belgilash (`PENDING`, `APPROVED`, `DENIED`). Bandlik organlari uchun eksport | M |
| FR-APP-07 | Suhbat va 2 haftalik sinov natijalarini kiritish, kasb tanlovi | M |
| FR-APP-08 | Ishlab chiqarish ta'limi shartnomasini PDF qilib yaratish (shablon) va imzolangan nusxani yuklash | S |

### 8.3. O'quv tizimi (EDU)
| ID | Talab | Daraja |
|---|---|---|
| FR-EDU-01 | Kurslar: kasb, trek, sanalar, modullar, soat normalari, sertifikat shartlari | M |
| FR-EDU-02 | Guruhlar: ustoz, ko'pi bilan 10 tinglovchi, jadval (hafta kunlari, vaqt, joy: NamDTU auditoriyasi / ustaxona / obyekt) | M |
| FR-EDU-03 | Davomat: ustoz bir ekranda butun guruhni belgilaydi (hammasi keldi + istisnolar). Kiritish 30 soniyadan oshmasligi kerak. **Oflayn** kiritish mumkin, aloqa tiklanganda yuboriladi | M |
| FR-EDU-04 | Obyektda ishlangan soatlar: ustoz kiritadi; obyekt ish beruvchisi ixtiyoriy ravishda tasdiqlaydi | M |
| FR-EDU-05 | Modul baholari (o'tdi / o'tmadi + ball + izoh + rasm dalil) | M |
| FR-EDU-06 | Yakuniy sinov: nazariy test (savollar banki, tasodifiy 30 savol, vaqt chegarasi) va amaliy baho (rubrika) | M |
| FR-EDU-07 | Tinglovchi kabineti: jadval, davomat foizi, baholar, progress paneli, "sertifikatgacha nima qoldi" ro'yxati | M |
| FR-EDU-08 | 3 kun ketma-ket kelmagan tinglovchi haqida ustoz, kurator va koordinatorga avtomatik ogohlantirish | S |
| FR-EDU-09 | Guruhni boshqa ustozga o'tkazish, tinglovchini boshqa guruh yoki trekka o'tkazish (tarix saqlanadi) | M |
| FR-EDU-10 | Kurator kabineti: guruh a'zolari, lug'at progressi reytingi, so'nggi faollik, eslatma yuborish | M |

### 8.4. Lug'at moduli (VOC)
| ID | Talab | Daraja |
|---|---|---|
| FR-VOC-01 | Har bir til uchun 1000 so'z: 600 ta umumiy yadro va 400 ta kasbga xos so'z (tuzilmasi: 8.4.1) | M |
| FR-VOC-02 | So'z kartochkasida: rasm, so'z, o'zbekcha talaffuz (lotin va kirill), tarjima, audio, misol jumla | M |
| FR-VOC-03 | Leitner usuli, 5 quti, takrorlash oralig'i 1/2/4/8/16 kun. Kuniga 20 yangi so'z (sozlanadi) | M |
| FR-VOC-04 | 4 xil mashq: rasm→so'z, audio→rasm, o'zbekcha→chet tilida, jumlani to'ldirish | M |
| FR-VOC-05 | Bot orqali kunlik mashq (08:00, vaqtni foydalanuvchi o'zgartira oladi) | M |
| FR-VOC-06 | Oflayn rejim: bugungi so'zlar audio bilan oldindan yuklab olinadi | S |
| FR-VOC-07 | Talaffuzni tekshirish (SI, `07_AI.md`) | C |
| FR-VOC-08 | Lug'at muallifi kabineti: CSV import, rasm va audio yuklash, ikki bosqichli ko'rib chiqish (muallif → muharrir) | M |
| FR-VOC-09 | Pasportda faqat 5-qutiga yetgan so'zlar soni ko'rsatiladi: "Nemis tili: 640/1000" | M |
| FR-VOC-10 | Majburiy til imtihoni bor davlatlar uchun ogohlantirish: "1000 so'z imtihonning o'rnini bosmaydi" (BR-04 bilan bog'liq) | M |

#### 8.4.1. 1000 so'z tuzilmasi (har bir til uchun)
| Qism | Kategoriya | So'zlar soni |
|---|---|---|
| Umumiy yadro | Muloqot va salomlashish | 100 |
| | Mehnat xavfsizligi | 120 |
| | Umumiy asboblar | 120 |
| | Umumiy materiallar | 100 |
| | Buyruq va harakatlar | 100 |
| | Raqam, o'lchov, vaqt | 60 |
| Kasbga xos | Tanlangan kasb bo'yicha | 400 |
| **Jami** | | **1000** |

Ishga tushirish tartibi: nemis, ingliz, arab (1-to'lqin), yapon, koreys, turk (2-to'lqin). Kontentni til yo'nalishidagi OTM bitiruvchilari (`vocab_author`) tayyorlaydi, muharrir tasdiqlaydi.

### 8.5. Sertifikatlash va QR pasport (CERT)
| ID | Talab | Daraja |
|---|---|---|
| FR-CERT-01 | Har kuni 02:00 da BR-09 shartlarini bajarganlar tekshiriladi. Ular uchun `DRAFT` sertifikat yaratiladi va tasdiqlovchilarga xabar yuboriladi | M |
| FR-CERT-02 | Tasdiqlash ekranida tinglovchining barcha dalillari ko'rinadi: davomat, baholar, soatlar, amaliy ish rasmlari | M |
| FR-CERT-03 | 2-tasdiqdan keyin: raqam beriladi `UB-{YYYY}-{NNNNNN}` (yil bo'yicha ketma-ket), kanonik JSON tuziladi, Ed25519 bilan imzolanadi, PDF va QR yaratiladi, MinIO'ga saqlanadi, Telegram'ga yuboriladi | M |
| FR-CERT-04 | Tekshirish sahifasi: holat (Haqiqiy / Bekor qilingan / Topilmadi), imzo tekshiruvi, BR-18 bo'yicha ochiq maydonlar | M |
| FR-CERT-05 | Sertifikatni bekor qilish (BR-23) | M |
| FR-CERT-06 | Davlat va xalqaro sertifikatlarni qayd etish: hujjat fayli, raqam, reyestr havolasi, amal qilish muddati | M |
| FR-CERT-07 | Ochiq kalit `/.well-known/uychibinokor-keys.json` manzilida e'lon qilinadi. Uchinchi tomon sertifikatni mustaqil tekshira oladi | S |
| FR-CERT-08 | Tekshirish sahifasi uz, ru, en, de va ar tillarida (arab tili RTL) | M |
| FR-CERT-09 | Har bir tekshirish loglanadi (IP hash, mamlakat, vaqt). Ustaga "Profilingiz 5 marta ko'rildi" statistikasi ko'rsatiladi | S |
| FR-CERT-10 | Sertifikat PDF'i A4 albom formatda, 2 tilda (o'zbek va ingliz), PDF/A-2b | M |

### 8.6. Usta profili va brigadalar (WRK)
| ID | Talab | Daraja |
|---|---|---|
| FR-WRK-01 | Usta profili: kasb(lar), daraja, sertifikatlar, tasdiqlangan soatlar, tillar (hujjat va so'zlar soni), portfolio, baholar, bandlik holati, hudud | M |
| FR-WRK-02 | Ko'rinish sozlamalari: har bir maydonni ommaga ko'rsatish yoki yashirish (rozilik bilan) | M |
| FR-WRK-03 | Portfolio: obyektga bog'langan rasmlar, ustoz yoki ish beruvchi tasdig'i | M |
| FR-WRK-04 | SI rezyume: ingliz, nemis, arab tillarida PDF (`07_AI.md`). Usta va menejer tekshirgandan keyin chiqariladi | S |
| FR-WRK-05 | Brigada tuzish: menejer kasb va maqsad davlati bo'yicha filtrdan a'zolarni tanlaydi. BR-07 va BR-08 avtomatik tekshiriladi | M |
| FR-WRK-06 | Brigadaning ochiq kartochkasi: kasb, a'zolar soni, tillar, o'rtacha daraja, tayyorlik foizi | M |

### 8.7. Ish beruvchilar va joylashtirish (EMP)
| ID | Talab | Daraja |
|---|---|---|
| FR-EMP-01 | Ish beruvchi ro'yxatdan o'tishi: kompaniya nomi, STIR, aloqa. Admin tekshirgunga qadar so'rov yuborish cheklangan | M |
| FR-EMP-02 | Qidiruv: kasb, daraja, til va so'zlar soni, hudud, bandlik holati, reyting. Saralanganlar ro'yxatini saqlash | M |
| FR-EMP-03 | So'rov formasi: kasb, soni (usta yoki brigada), muddat, joy, ish sharoiti va maosh oralig'i, yashash joyi (xorij uchun) | M |
| FR-EMP-04 | Menejer kanbani (7.4), SLA hisoblagichi (KPI-08), nomzodlarni qo'lda va SI tavsiyasi bilan tanlash | M |
| FR-EMP-05 | Ish beruvchi nomzodlarni anonim ko'rinishda ko'radi va tasdiqlaydi. Shartnoma bosqichida menejer aloqani o'rnatadi (BR-17) | M |
| FR-EMP-06 | Joylashtirishni qayd etish (`placements`): shartnoma turi (autstaffing, pudrat, to'g'ridan-to'g'ri, xorij), sanalar, maosh | M |
| FR-EMP-07 | Ish tugagach baho berish: 1–5 ball, 4 mezon (sifat, intizom, xavfsizlik, muloqot) + izoh | M |
| FR-EMP-08 | Xorijiy ish beruvchi kabineti ingliz va nemis tillarida. So'rov BR-14 bo'yicha agentlikka boradi | M |
| FR-EMP-09 | Agentlik roli (`partner_viewer` + `agency` belgisi): o'ziga biriktirilgan xorijiy so'rovlarni ko'radi, nomzodlar ro'yxatiga javob beradi | S |

### 8.8. Obyektlar va materiallar (OBJ, MAT)
| ID | Talab | Daraja |
|---|---|---|
| FR-OBJ-01 | Obyekt: nomi, manzil va koordinata, buyurtmachi, holat, progress %, sanalar, oldin/keyin rasmlari, ishlagan brigada va ustalar | S |
| FR-OBJ-02 | Obyekt rasmlariga sana, muallif va EXIF geolokatsiyasi tekshiruvi qo'shiladi (`REAL_UYCHI`) | S |
| FR-MAT-01 | Ishlab chiqaruvchi profili (tekshirilgan belgisi bilan), mahsulotlar: kategoriya, nomi, birlik, narx, minimal partiya, sertifikat (GOST yoki O'z DSt), rasmlar, mavjudligi | S |
| FR-MAT-02 | Buyurtma so'rovi (ism, telefon, soni, izoh). Ishlab chiqaruvchiga bot va kabinet orqali yetkaziladi. Holatlar: NEW, CONTACTED, DONE, CANCELLED | S |
| FR-MAT-03 | Narx 30 kundan ortiq yangilanmasa "Narx eskirgan bo'lishi mumkin" belgisi chiqadi | S |

### 8.9. Hamkorlar, kontent, hisobotlar (PRT, CMS, REP)
| ID | Talab | Daraja |
|---|---|---|
| FR-PRT-01 | Hamkor: turi, mamlakat, holat, logotip, logotipga ruxsat, kelishuv fayli (ichki), imzolangan sana | M |
| FR-CMS-01 | Yangiliklar, sahifa matnlari va FAQ'ni admin paneldan tahrirlash (4 tilda), qoralama va e'lon qilish | M |
| FR-CMS-02 | Media kutubxonasi: manba turi (`REAL_UYCHI`, `PARTNER`, `ILLUSTRATION`), sana, muallif, foydalanish huquqi | M |
| FR-REP-01 | Voronka: ariza → qabul → o'qish → sertifikat → ish (mahalla, kasb va davr bo'yicha) | M |
| FR-REP-02 | Bandlik organlari uchun vaucher hisoboti (kelishilgan format, Excel) | M |
| FR-REP-03 | KPI paneli (2-bo'lim) | M |
| FR-REP-04 | Excel va PDF eksport. Har bir eksport audit logiga yoziladi | M |

### 8.10. Xabarnomalar (NTF)
| Hodisa | Kimga | Kanal |
|---|---|---|
| Ariza holati o'zgardi | Arizachi | Telegram, kabinet |
| Ertangi dars jadvali | Tinglovchi | Telegram (19:00) |
| Davomat kiritilmadi | Ustoz | Telegram (18:00) |
| 3 kun kelmadi | Ustoz, kurator, koordinator | Telegram |
| Kunlik so'zlar | Tinglovchi (tashqi trek) | Telegram (08:00) |
| Sertifikat tasdiq kutmoqda | Tasdiqlovchilar | Telegram, kabinet |
| Sertifikat berildi | Bitiruvchi | Telegram + PDF |
| Yangi so'rov / SLA tugayapti | Menejer | Telegram |
| Nomzodlar ro'yxati tayyor | Ish beruvchi | Email, kabinet |
| Yangi material buyurtmasi | Ishlab chiqaruvchi | Telegram |

Foydalanuvchi har bir turdagi xabarni o'chira oladi. Xavfsizlikka oid xabarlar (kirish kodi) bundan mustasno.

## 9. Kontent talablari

- Barcha matnlar `02_DESIGN_SYSTEM.md` 10-bo'limidagi uslubda yoziladi: oddiy, aniq, "siz" murojaati bilan.
- Raqamlar faqat tasdiqlangan manbadan olinadi. Taxminiy raqamlar yonida "taxminiy" belgisi turadi.
- Imzolanmagan kelishuvlar "muzokara jarayonida" yoki "rejalashtirilgan" deb yoziladi.
- Rasmlar BR-20 qoidasiga bo'ysunadi. Ishga tushirishgacha Uychidagi kamida 30 ta real surat tayyorlanadi: yangilangan binolar, yo'llar, obyektlar, ustaxonalar.

## 10. Huquqiy talablar (batafsil: `06_SECURITY.md`, 7-bo'lim)

- "Shaxsga doir ma'lumotlar to'g'risida"gi Qonun: rozilik, lokalizatsiya (serverlar O'zbekistonda), ma'lumotlar bazasini davlat reyestrida ro'yxatdan o'tkazish.
- Ish izlovchidan haq olish taqiqi. Xorijga ishga joylashtirish faqat litsenziyali tashkilot orqali.
- Mehnat kodeksi: ishlab chiqarish ta'limi shartnomasi.
- Xorijiy tashkilotlar logotiplaridan foydalanish faqat yozma ruxsat bilan.
