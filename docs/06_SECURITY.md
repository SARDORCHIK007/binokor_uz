# 06. Xavfsizlik va shaxsiy ma'lumotlar

Maqsadli daraja: **OWASP ASVS 4.0.3, 2-daraja (L2)**. Imzolash xizmati va shaxsiy hujjatlar uchun ayrim 3-daraja (L3) talablari ham qo'llanadi.

## 1. Himoya qilinadigan aktivlar

| Aktiv | Maxfiylik | Butunlik | Mavjudlik | Izoh |
|---|---|---|---|---|
| JShShIR, pasport, manzil | **Yuqori** | Yuqori | O'rta | Shifrlanadi, kirish loglanadi |
| Sertifikat ma'lumoti va imzo kaliti | O'rta / **Kritik** (kalit) | **Kritik** | Yuqori | Soxta sertifikat loyiha ishonchini yo'q qiladi |
| Telefon, Telegram ID | Yuqori | O'rta | O'rta | Ish beruvchilarga ko'rsatilmaydi |
| Baholar, davomat | O'rta | Yuqori | O'rta | Sertifikatga asos bo'ladi |
| Shartnomalar | Yuqori | Yuqori | O'rta | `private/` papkada |
| Ochiq profil, katalog | Past | O'rta | Yuqori | |
| Admin hisoblari | **Kritik** | Kritik | Yuqori | 2FA majburiy |

## 2. Tahdidlar modeli (STRIDE)

| № | Tahdid | Misol | Chora |
|---|---|---|---|
| T1 | **S**poofing (o'zini boshqa shaxs deb ko'rsatish) | Birovning telefoniga OTP so'rash, admin hisobini egallash | OTP limitlari, 5 urinish, qurilma va IP bo'yicha limit; adminlar uchun TOTP 2FA; yangi qurilmadan kirilganda Telegram'ga xabar |
| T2 | **T**ampering (ma'lumotni o'zgartirish) | Sertifikat ma'lumotini bazada o'zgartirish, PDF'ni tahrirlash | Ed25519 imzo, tekshirish sahifasi jonli ma'lumotni imzo bilan solishtiradi; `audit_log` faqat qo'shiladi; bazada ilova foydalanuvchisiga minimal huquqlar |
| T3 | Soxta QR | Boshqa domenga olib boruvchi QR yasash | Tekshirish sahifasida domen ko'rinadi va ogohlantirish beriladi: "Faqat uychibinokor.uz manzilida tekshiring"; PDF'da qisqa havola matn bilan yoziladi |
| T4 | **R**epudiation (harakatdan tonish) | Ustoz "men tasdiqlamaganman" deydi | Har bir tasdiq va qaror kim, qachon, qaysi IP'dan qilgani bilan loglanadi |
| T5 | **I**nformation disclosure (ma'lumot oqib chiqishi) | IDOR: `/persons/{id}` orqali boshqa odam ma'lumotini olish; ish beruvchi telefonni ko'rishi | Har bir so'rovda obyekt darajasida ruxsat tekshiruvi (`policy` qatlami); ochiq javoblar uchun alohida "public" sxemalar; taxmin qilib bo'lmaydigan slug'lar; IDOR uchun avtomatik testlar |
| T6 | Ommaviy yig'ib olish (scraping) | Usta katalogini to'liq yuklab olish | Rate limit, pagination limiti 50, bot aniqlash, ochiq javoblarda minimal ma'lumot |
| T7 | **D**oS | `/verify` yoki OTP'ga hujum | Nginx rate limit, kesh, captcha (formalar), provayder darajasida DDoS himoyasi |
| T8 | SMS bombing va pul sarflash | OTP so'rovlarini ko'p yuborish | SMS faqat Telegram muvaffaqiyatsiz bo'lsa yuboriladi; 1 raqamga kuniga 5 SMS, 1 IP'ga kuniga 20; captcha |
| T9 | **E**levation of privilege (huquqni oshirish) | Talaba o'ziga `admin` rolini qo'shishi | Rollarni faqat `superadmin` beradi, bu loglanadi; rol tekshiruvi faqat backend'da |
| T10 | Zararli fayl | Yuklangan PDF yoki rasmda zararli kod | MIME tekshiruvi, ClamAV, EXIF tozalash, rasmni qayta kodlash, alohida domendan berish (`files.uychibinokor.uz`) |
| T11 | XSS / injeksiya | CMS matni, ism maydoni | React avtomatik ekranlashtiradi; CMS uchun sanitayzer (allowlist); qattiq CSP; parametrlashtirilgan SQL (ORM) |
| T12 | Ichki xavf | Xodim ma'lumotni eksport qilib olib ketishi | Eksport huquqi faqat ayrim rollarga beriladi; har bir eksport loglanadi va suv belgisi qo'yiladi (kim, qachon); JShShIR eksportga kirmaydi |
| T13 | SI orqali ma'lumot oqishi | LLM'ga shaxsiy ma'lumot yuborilishi | Anonimlashtirish qatlami (`07_AI.md`), xom PD'ni tashqi API'ga yuborish taqiqlanadi |
| T14 | Ta'minot zanjiri | Zararli npm yoki pip paketi | Lockfile, `pip-audit`, `npm audit`, Dependabot yoki Renovate, `trivy` image skaneri, paketlarni qo'shish faqat PR orqali |

## 3. Autentifikatsiya va sessiyalar

| ID | Talab |
|---|---|
| SEC-AUTH-01 | Kirish telefon raqami + bir martalik kod (OTP) orqali. Kod 6 xonali, kriptografik tasodifiy, 5 daqiqa amal qiladi, 5 urinishgacha. Bazada faqat xesh saqlanadi |
| SEC-AUTH-02 | Kanalni server tanlaydi. Standart — Telegram. SMS faqat bog'langan Telegram bo'lmasa yoki Telegram yetkazilmasa yuboriladi va captcha talab qiladi. So'rovdagi `channel` faqat afzallik |
| SEC-AUTH-03 | `superadmin`, `admin`, `education_lead`, `cert_officer`, `placement_manager` rollari uchun **TOTP 2FA majburiy**. 10 ta bir martalik zaxira kod beriladi |
| SEC-AUTH-04 | Access JWT (EdDSA, 15 daqiqa), refresh token (tasodifiy 256 bit, `httpOnly; Secure; SameSite=Strict` cookie, 30 kun, har ishlatilganda yangilanadi). Eski refresh qayta ishlatilsa, foydalanuvchining barcha sessiyalari bekor qilinadi |
| SEC-AUTH-05 | Admin sessiyasi 30 daqiqa harakatsizlikdan keyin tugaydi. Boshqa rollar uchun 30 kun |
| SEC-AUTH-06 | Foydalanuvchi o'z faol sessiyalarini ko'radi va bekor qila oladi |
| SEC-AUTH-07 | Telefon raqamini o'zgartirish uchun eski va yangi raqamga kod yuboriladi |
| SEC-AUTH-08 | OneID (4-bosqich): shaxsni tasdiqlash uchun qo'shimcha usul |

## 4. Ruxsatlar matritsasi (RBAC + obyekt darajasida)

Belgilar: **C** yaratish, **R** o'qish, **U** o'zgartirish, **D** o'chirish, **A** tasdiqlash, **E** eksport. `own` — faqat o'ziniki; `scope` — o'z mahallasi, guruhi yoki kompaniyasi; `anon` — anonimlashtirilgan ko'rinish.

| Resurs \ Rol | super-admin | admin | edu_lead | cert_off | place_mgr | coord | mentor | teacher | curator | student | worker | emp_loc | emp_for | producer | partner_v | vocab_auth | content_ed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Foydalanuvchilar, rollar | CRUD | R | R | – | – | – | – | – | – | – | – | – | – | – | – | – | – |
| Shaxs: asosiy | CRUD | CRU | R | R | R | CRU scope | R scope | R scope | R scope | RU own | RU own | – | – | – | – | – | – |
| Shaxs: JShShIR, pasport | R* | R* | – | – | – | C scope | – | – | – | C own | – | – | – | – | – | – | – |
| Arizalar | CRUD | CRUDE | RUE | R | R | CRU scope | – | – | – | CRU own | – | – | – | – | R agg | – | – |
| Kurslar, modullar | CRUD | CRUD | CRUD | R | R | R | R | RU | R | R own | – | – | – | – | – | – | – |
| Guruhlar, o'qishga yozish | CRUD | CRUD | CRUD | R | R | R scope | R scope | R scope | – | R own | – | – | – | – | – | – | – |
| Davomat, soatlar | CRUD | CRU | RU | R | – | R scope | CRU scope | R scope | R scope | R own | – | U (tasdiq) | – | – | – | – | – |
| Baholar, imtihon | CRUD | CRU | CRU | R | – | – | CRU scope | CRU scope | – | R own | – | – | – | – | – | – | – |
| Kurator guruhlari | CRUD | CRUD | CRUD | – | – | R | – | – | RU own | R own | – | – | – | – | – | – | – |
| Sertifikat qoralamasi, qaror | CRUD | R | **A** | **A** | R | – | **A** scope | – | – | R own | R own | – | – | – | – | – | – |
| Sertifikatni bekor qilish | A | – | A | A | – | – | – | – | – | – | – | – | – | – | – | – | – |
| Ishchi profili | CRUD | RU | R | R | RU | R | R | – | – | – | RU own | R anon | R anon | – | – | – | – |
| Brigadalar | CRUD | CRUD | R | R | CRUD | – | – | – | – | – | R own | R | R | – | – | – | – |
| Ish beruvchilar | CRUD | CRUA | – | – | RU | – | – | – | – | – | – | RU own | RU own | – | – | – | – |
| So'rovlar | CRUD | R | – | – | CRUD | – | – | – | – | – | R (o'ziga) | CR own | CR own | – | R (agentlik) | – | – |
| Joylashtirish, baholar | CRUD | R | – | – | CRUD | – | – | – | – | – | R own | CR own | CR own | – | R agg | – | – |
| Obyektlar | CRUD | CRUD | R | – | CRU | – | U (rasm) | – | – | – | U (portfolio) | – | – | – | – | – | – |
| Materiallar, buyurtmalar | CRUD | CRUD | – | – | – | – | – | – | – | – | – | – | – | CRUD own | – | – | – |
| Hamkorlar | CRUD | CRUD | – | – | R | – | – | – | – | – | – | – | – | – | – | – | – |
| CMS, media | CRUD | CRUD | – | – | – | – | – | – | – | – | – | – | – | – | – | – | CRUD |
| Lug'at kontenti | CRUD | CRUDA | – | – | – | – | – | – | – | – | – | – | – | – | – | CRU own | A |
| Hisobotlar | RE | RE | RE | R | RE | R scope | – | – | – | – | – | – | – | – | RE agg | – | – |
| Audit log | R | R | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – |

`*` — faqat sabab ko'rsatilsa ochiladi, har bir ochish loglanadi (`person.sensitive.view`). `agg` — faqat yig'ma, shaxsni aniqlab bo'lmaydigan ma'lumot.

**Amalga oshirish.** Har bir router `require(permission, resource_loader)` dekoratori bilan himoyalanadi. `policy.py` faylida har bir resurs uchun `can(user, action, obj)` funksiyasi yoziladi. Matritsaning har bir katagi uchun **avtomatik test** yoziladi (parametrlashtirilgan pytest).

## 5. Kriptografiya

| Narsa | Usul |
|---|---|
| Transport | TLS 1.2+ (1.3 tavsiya), HSTS `max-age=31536000; includeSubDomains; preload`, faqat HTTPS |
| JShShIR, pasport, manzil, TOTP siri | AES-256-GCM, ilova darajasida (envelope encryption: ma'lumot kaliti (DEK) master kalit (KEK) bilan shifrlanadi; KEK serverda alohida turadi, repozitoriyda emas) |
| Dublikat qidirish | `HMAC-SHA256(pinfl, pepper)` |
| OTP, refresh token | SHA-256 xesh |
| Sertifikat imzosi | Ed25519, RFC 8785 JCS kanonik JSON, `kid` bilan. Kalit alohida konteynerda, yiliga bir marta rotatsiya qilinadi |
| JWT | EdDSA, `kid`, 15 daqiqa |
| Zaxira nusxalar | restic (AES-256), kalit oflayn saqlanadi |
| Tasodifiy sonlar | `secrets` (Python), `crypto.getRandomValues` (brauzer) |

## 6. Ilova xavfsizligi

| ID | Talab |
|---|---|
| SEC-APP-01 | HTTP sarlavhalari: CSP (`default-src 'self'`; skriptlar uchun nonce; `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (kamera faqat yuklash sahifalarida) |
| SEC-APP-02 | Barcha kirish ma'lumotlari Pydantic va Zod sxemalari bilan tekshiriladi. Ortiqcha maydonlar rad etiladi (`extra="forbid"`) |
| SEC-APP-03 | SQL faqat ORM yoki parametrlashtirilgan so'rovlar orqali. `text()` ichida f-string ishlatish taqiqlanadi (Ruff qoidasi) |
| SEC-APP-04 | CMS HTML'i `nh3` (allowlist) bilan tozalanadi |
| SEC-APP-05 | Fayllar alohida domendan beriladi, `Content-Disposition` to'g'ri qo'yiladi |
| SEC-APP-06 | Xato javoblarida stack trace va ichki ma'lumot qaytarilmaydi |
| SEC-APP-07 | CORS: faqat `uychibinokor.uz` va staging domeni |
| SEC-APP-08 | Ommaviy formalarda captcha (Turnstile yoki hCaptcha) va honeypot maydon |
| SEC-APP-09 | Maxfiy ma'lumotlar (kalitlar, parollar) `.env` va Docker secrets'da. Repozitoriyda `gitleaks` tekshiruvi ishlaydi |
| SEC-APP-10 | Bot webhook maxfiy yo'l va `secret_token` sarlavhasi bilan himoyalanadi |

## 7. Shaxsiy ma'lumotlar: huquqiy talablar

Asos: O'zbekiston Respublikasining **"Shaxsga doir ma'lumotlar to'g'risida"gi Qonuni** (O'RQ-547, 2019) va unga kiritilgan o'zgartishlar. Yurist ishga tushirishdan oldin joriy tahririni lex.uz'da tekshiradi.

| ID | Talab | Platformadagi yechim |
|---|---|---|
| LEG-01 | Subyektning **roziligi** | Ariza topshirishda alohida rozilik belgilari olinadi: ma'lumotni qayta ishlash, ochiq profil, rasm, SI orqali ishlov berish, xabarlar. Har birining matni versiyasi bilan `consents` jadvalida saqlanadi |
| LEG-02 | **Lokalizatsiya**: O'zbekiston fuqarolarining shaxsiy ma'lumotlari O'zbekiston hududidagi serverlarda saqlanadi | Asosiy va zaxira serverlar O'zbekistonda. Xorijiy CDN orqali shaxsiy ma'lumot o'tkazilmaydi (faqat statik fayllar) |
| LEG-03 | Shaxsga doir ma'lumotlar bazasini **Shaxsga doir ma'lumotlar bazalarining davlat reyestrida ro'yxatdan o'tkazish** | Operator (UYCHI BINOKOR MChJ) ishga tushirishdan oldin bazani reyestrga ro'yxatdan o'tkazadi. Ariza id.gov.uz orqali kiruvchi tizimda beriladi. Guvohnoma raqami maxfiylik siyosatida ko'rsatiladi |
| LEG-04 | Maqsadga erishilganda yoki rozilik qaytarib olinganda ma'lumotlarni **yo'q qilish** | `/me/delete-request` → 30 kun ichida bajariladi. Sertifikat reyestri (raqami, kasbi, sanasi) qonuniy asos bilan saqlab qolinadi, shaxsiy maydonlar o'chiriladi |
| LEG-05 | Subyektning o'z ma'lumotlari bilan tanishish huquqi | `/me/data-export` |
| LEG-06 | Maxsus ma'lumotlar (sog'liq) | Faqat "tibbiy ko'rikdan o'tgan: ha/yo'q" va sana saqlanadi. Tashxis saqlanmaydi |
| LEG-07 | Uchinchi shaxslarga berish | Ish beruvchiga faqat ustaning roziligi bilan va shartnoma bosqichida beriladi. Xorijiy agentlikka faqat usta so'rovni qabul qilgandan keyin beriladi |
| LEG-08 | Ish izlovchidan haq olish taqiqi | Platformada ish izlovchi uchun hech qanday to'lov funksiyasi yo'q |
| LEG-09 | Voyaga yetmaganlar | Ariza 16 yoshdan qabul qilinadi. 18 yoshgacha bo'lganlar uchun ota-ona roziligi fayli majburiy |
| LEG-10 | Maxfiylik siyosati va foydalanish shartlari | 4 tilda e'lon qilinadi, versiyalanadi, o'zgarsa foydalanuvchiga xabar beriladi |

**Saqlash muddatlari:**
| Ma'lumot | Muddat |
|---|---|
| Rad etilgan ariza | 1 yil, keyin anonimlashtiriladi |
| OTP kodlari | 24 soat |
| Kirish loglari | 1 yil |
| Audit log | 5 yil |
| Tekshirish loglari | 2 yil (IP xesh holida) |
| Sertifikat reyestri | Doimiy |

## 8. Infratuzilma xavfsizligi

- Serverlarga SSH faqat kalit bilan, parol bilan kirish o'chirilgan. `fail2ban`, faqat kerakli portlar ochiq (80, 443), boshqaruv VPN (WireGuard) orqali.
- PostgreSQL, Redis va MinIO tashqi tarmoqqa ochilmaydi. Har bir servis o'z foydalanuvchisi va minimal huquqlari bilan ishlaydi.
- Konteynerlar `non-root` foydalanuvchi bilan va `read-only` fayl tizimida ishlaydi (iloji bo'lsa).
- Avtomatik xavfsizlik yangilanishlari (`unattended-upgrades`). Docker image'lar har hafta qayta yig'iladi.
- Admin paneli qo'shimcha ravishda IP allowlist yoki VPN orqali ochiladi **[S]**.

## 9. Hodisalarga javob berish

| Bosqich | Harakat | Muddat |
|---|---|---|
| Aniqlash | Monitoring ogohlantirishi yoki foydalanuvchi xabari | — |
| Cheklash | Kalitlarni almashtirish, sessiyalarni bekor qilish, zaif endpointni o'chirish | ≤ 4 soat |
| Baholash | Qaysi ma'lumot va qancha subyekt ta'sirlanganini aniqlash | ≤ 24 soat |
| Xabar berish | Vakolatli organ va ta'sirlangan subyektlarga qonunda belgilangan tartibda | Qonun bo'yicha |
| Tiklash va xulosa | Sabab tahlili (post-mortem), choralar | ≤ 7 kun |

Sertifikat imzo kaliti oshkor bo'lsa: kalit `revoked` qilinadi, yangi kalit e'lon qilinadi, shu kalit bilan imzolangan barcha sertifikatlar yangi kalit bilan qayta imzolanadi va raqamlari o'zgarmaydi.

## 10. Ishga tushirishdan oldingi tekshiruv

- [ ] OWASP ASVS L2 tekshiruv varag'i to'ldirilgan, bajarilmagan bandlar sababi bilan qayd etilgan
- [ ] Mustaqil pentest (kamida veb-ilova va API), kritik va yuqori darajadagi topilmalar yopilgan
- [ ] Ruxsatlar matritsasi testlari 100% o'tadi
- [ ] Zaxiradan tiklash sinovi muvaffaqiyatli, natija qayd etilgan
- [ ] Ma'lumotlar bazasi davlat reyestrida ro'yxatdan o'tgan (LEG-03)
- [ ] Maxfiylik siyosati yurist tomonidan tasdiqlangan
- [ ] Imzo kaliti yaratilgan, zaxira nusxasi oflayn joyda saqlanmoqda, ochiq kalit e'lon qilingan
- [ ] Barcha admin hisoblarida 2FA yoqilgan
