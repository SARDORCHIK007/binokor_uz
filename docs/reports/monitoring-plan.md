# Baholash va kuzatish moduli — HEMIS asosida reja (2026-11-12)

## HEMIS'dan nima olinadi
Ochiq manbalar bo'yicha (hemis.uz ichki hujjati ko'rilmadi, shuning uchun faqat ochiq tavsiflarga tayandim):
- **Qaydnoma (jurnal):** o'qituvchi davomat va ballarni kiritadi; xato ballni tuzatish uchun prorektorga so'rov yuboradi, so'rov holati ko'rinib turadi.
- **Talabalar so'rovnomasi:** semestr oxirida anonim, o'qitish sifati va o'qituvchining munosabati bo'yicha; natijalar muassasa reytingiga kiradi.
- **Reyting daftarchasi va transkript:** talaba o'zlashtirish ko'rsatkichlari va jadvalini ko'radi.
- **Rahbariyat paneli:** o'zlashtirish, davomat, o'qituvchilar bo'yicha yig'ma hisobotlar.

## Bizda nima qilinadi (bosqichlar)
1. **O'qituvchi reytingi.** Talaba semestr oxirida (yilda 2 davr) o'z ustozini 6 mezon bo'yicha 1–5 ball bilan baholaydi va fikr yozadi.
   Fikr anonim: direktor talaba kimligini ko'rmaydi. Umumiy reyting (0–100) to'rt ko'rsatkichdan iborat: so'rovnoma (40%),
   tinglovchilar natijasi (25%), tinglovchilar davomati (20%), jurnal faolligi (15%). Ma'lumoti yo'q ko'rsatkich hisobga olinmaydi, qolganlar qayta taqsimlanadi.
   Og'irliklar ekranda ochiq ko'rsatiladi; buyurtmachi o'zgartirishni so'rashi mumkin.
2. **Direktor paneli:** tinglovchilar, ustozlar, guruhlar, o'rtacha davomat va ball, so'rovnoma qatnashishi; ustozlar reytingi jadvali; har bir ustoz
   sahifasi (mezonlar, davrlar bo'yicha o'zgarish, anonim fikrlar, guruhlari); barcha tinglovchilar ro'yxati xavf belgilari bilan.
3. **Tinglovchi:** o'z ustozini baholash sahifasi; reyting daftarchasi (modullar, ball, davomat, guruhdagi o'rni).
4. **Ustoz:** o'z reytingi va tinglovchilar fikri.

## Boshqa profillar
- **Ish beruvchi / xorijiy ish beruvchi:** boy vakansiya (talablar, majburiyatlar, shartlar, aniq manzil), yuridik ma'lumot va hujjat yuklash.
- **Migratsiya agentligi:** nomzodlar havzasi (sertifikat, til, kasb bo'yicha filtr), vakansiyaga tanlash, bosqichlar (hujjat, til, suhbat, viza, jo'nash), kelishilgan firmalar.
- **Bandlik bo'limi:** loyihadagi hamma tinglovchi va ustalar reestri, talabgor va hamkor qo'shish.
- **NamDTU:** bitiruvchilar reestri (ro'yxat kiritish, bog'lanish holati, loyihaga jalb qilish). Alohida rol: `university_officer`.
- Respublika migratsiya nazoratchisi alohida panel emas: migratsiya panelining faqat ko'rish rejimi.

## Cheklovlar
- Hujjat fayllari bazada saqlanadi (5 MB gacha, PDF/JPG/PNG); antivirus tekshiruvi ulanmagan.
- HEMIS bilan to'g'ridan-to'g'ri integratsiya yo'q (ularning API talabi kerak): bu tizim HEMIS g'oyalarining nusxasi, ular bilan ma'lumot almashmaydi.
