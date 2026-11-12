# Savollar

## Hamkor logotiplari (BR-15) — 2026-11-09
Buyurtmachi NamDTU va Tashqi mehnat migratsiyasi agentligi logotiplarini sahifada ko'rsatishni so'radi.
Logotiplar `apps/web/public/media/partners/` papkasiga qo'yildi va fayl mavjud bo'lsa ko'rsatiladi.
BR-15 esa yozma ruxsatni talab qiladi (`partners.logo_permission` + ruxsat fayli). Ruxsat hujjatlari hali bazada yo'q.
Ommaviy ishga tushirishdan oldin: har bir hamkordan yozma ruxsatni olish va bazaga yozish; hokimlik gerbi fayli ham kerak.

## O'qish muddati (BR-03, BR-04) — 2026-11-10
Buyurtmachi talabi: barcha kurslar 6–12 oy; faqat kasbi ham, tili ham bor kishilar uchun 3 oy.
Oldingi hujjatda ichki trek 3–6 oy, D toifa uchun 1 oy edi. `docs/01_PRD.md` BR-03/BR-04, `courses_duration_check` (migratsiya 0008) va `rules.course_duration_ok` yangilandi; mavjud 6 oydan qisqa kurslar 180 kunga uzaytirildi.
Aniqlashtirish kerak: tezlashtirilgan kursga faqat D toifali arizachilar yozilishi kerak. Hozir dasturda arizani guruhga yozish endpoint'i yo'q (faqat seed), shuning uchun bu tekshiruvni guruhga yozish yaratilganda qo'shish kerak (`courses.accelerated` belgisi tayyor).

## Tuman bandlikka ko'maklashish bo'limi — 2026-11-10
Hamkorlar ro'yxatiga qo'shildi (GOV, holati PLANNED, slug `tuman-bandlik`). Shartnoma imzolangani va logotip ruxsati haqida ma'lumot yo'q, shuning uchun SIGNED qilinmadi. Imzolangach admin holatni o'zgartirishi kerak (BR-15).

## request_candidates.status uzunligi — 2026-11-12
`request_candidates.status` ustuni `varchar(16)`, lekin CHECK ro'yxatidagi `EMPLOYER_APPROVED` va `EMPLOYER_REJECTED` 17 belgidan iborat: bu ikki qiymatni saqlab bo'lmaydi.
Migratsiya bosqichlari uchun alohida `stage` ustuni qo'shildi (migratsiya 0012), shuning uchun bu ish to'xtamadi. Ish beruvchi tasdig'i oqimi qayta ko'rib chiqilganda ustunni `varchar(20)` ga kengaytirish kerak.
