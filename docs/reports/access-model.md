# Tashkilotlar tizimga qanday kiradi — kirish modeli (2026-11-12)

## Asosiy qoida
Hamma foydalanuvchi **telefon raqami + bir martalik kod** (Telegram bot) bilan kiradi. Parol yo'q.
Hisob yaratish uchun alohida ro'yxatdan o'tish kerak emas: telefon raqami bilan birinchi marta kirgan kishi hisob oladi.
Tashkilot xodimlariga rol **taklifnoma** orqali beriladi (o'zi tanlab bo'lmaydi).

## Taklifnoma oqimi
1. Administrator `Taklifnomalar` sahifasida telefon, ism, rol (kerak bo'lsa tashkilot, mahalla yoki kompaniya) kiritadi.
   Ustozlar uchun 200 tagacha qatorni birdan yuborish mumkin: `+998901234567, Familiya Ism`.
2. Xodim saytga shu raqam bilan kiradi. Kod tasdiqlangach tizim kutilayotgan taklifnomani qo'llaydi: rol beriladi,
   tashkilotga (`partner_members`), mahallaga (`staff_mahallas`) yoki xorijiy kompaniyaga (`employers` + `employer_members`) biriktiriladi.
3. Taklif qilingan odam "tinglovchi" bo'lib boshlamaydi; faqat o'z roli bilan kiradi. Taklifnoma 30 kun amal qiladi, bekor qilinishi mumkin.
4. Hokimlik, bandlik va migratsiya xodimlari (`district_official`, `employment_officer`, `agency_officer`) 2 bosqichli tasdiqdan (TOTP) o'tadi.

## Rollar va panellar
| Kim | Rol | Panel |
|---|---|---|
| Loyiha o'quv direktori | `education_lead` | Hisobot, sertifikat imzolash |
| NamDTU vakili | `education_lead` + hamkor `namdtu` | Sertifikat imzolash |
| Hokimlik | `district_official` | Hisobot, mahallalar, sertifikat imzolash (faqat ko'rish va imzo) |
| Mahalla hokim yordamchisi | `mahalla_assistant` + mahalla | Mahalladagi nomzodlarni ro'yxatga olish, arizalar holati |
| Tuman bandlik bo'limi | `employment_officer` | Ish izlovchilar, so'rovlar, nomzod tavsiya qilish, joylashtirish doskasi |
| Tashqi mehnat migratsiyasi agentligi | `agency_officer` | Xorijiy vakansiyalar, davlatlar, jarayon, nomzod tavsiyasi, CSV |
| Respublika migratsiya nazorati | `migration_observer` | Xuddi shu ko'rsatkichlar, faqat ko'rish |
| Xorijiy ish beruvchi | `employer_foreign` | Vakansiya joylash va yopish |
| Ustozlar (o'nlab) | `mentor` | Guruh, davomat, baho |

## Hamkor bo'lishni xohlagan tashkilot
Ommaviy `Hamkorlar → Hamkor bo'lish` shakli so'rov qoldiradi (`partner_requests`). Administrator so'rovni ko'rib chiqadi
va tasdiqlagach tegishli rol bilan taklifnoma yuboradi. Hamkor holati (`SIGNED`) faqat shartnoma imzolangach o'zgartiriladi (BR-15).

## Mahalla orqali ariza (BR: source = MAHALLA)
Yordamchi nomzodni o'z mahallasiga biriktirilgan holda kiritadi. Yozma rozilik tasdig'i majburiy. Nomzod uchun hisob yaratiladi;
u shu telefon bilan kirib arizasini ko'radi. Telefon ro'yxatda ko'rsatilmaydi.

## Biznes qoida
Tashqi vakansiya `NEW` holatidan keyin faqat agentlik orqali o'tadi (`demand_requests_check`); agentlik xodimi `AGENCY` turidagi
ish beruvchi yozuviga biriktiriladi.

## Hali qilinmagan (buyurtmachi bilan kelishish kerak)
- Agentlikning o'z tizimi bilan **avtomatik integratsiya** (API kalit, vakansiyalarni ikki tomonlama almashish): ularning texnik talabi kerak.
- Har bir tashkilotning **alohida imzo kaliti**: hozir imzo tizim kaliti bilan, tashkilot nomidan qo'yiladi.
- Telegram/SMS orqali taklifnoma yetkazish: hozir xodim saytga o'zi kiradi.
- Hamkor xodimlari faqat o'z tashkiloti ma'lumotini tahrirlashi (hamkor profilini tahrirlash paneli).
- Mahalla yordamchisining nomzodni keyingi bosqichda qayta ko'rib chiqish so'rovi.
