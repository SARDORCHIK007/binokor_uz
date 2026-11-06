# 10 daqiqalik taqdimot

Sayt: http://localhost:8090

Kirishdan oldin brauzerni to'liq ekranga qo'ying. Demo tugmalari `/kirish` da.

1. **Bosh sahifa** — http://localhost:8090  
   Ayting: «Usta Uychida tayyorlanadi. Qidiruv, ariza va sertifikat bitta joyda.» 3D bino sekin aylanadi. Raqamlar bazadan.

2. **Kasblar** — «Kasblar» menyusi. 12 ta kasb, ichki va tashqi muddat. Bitta kasbni oching.

3. **Usta pasporti** — «Ustalar». Birinchi kartani oching. QR va kasb ko'rinadi. Telefon raqami bu yerda chiqmaydi.

4. **Tekshiruv** — http://localhost:8090/verify/UB-2026-000001  
   Yashil «HAQIQIY» muhr. «Imzo bazadagi yozuvga yopishgan.»

5. **Ariza** — http://localhost:8090/ariza  
   Bir qadam ko'rsating. Topshirmang, agar namuna arizani buzishni xohlamasangiz.

6. **Admin** — http://localhost:8090/kirish → «Administrator». Panel: ariza, o'qiyapti, sertifikat, ish. Voronka grafigi.

7. **Ustoz, telefon** — chiqing, `/kirish` → «Ustoz». Brauzerni tor qiling. http://localhost:8090/kabinet/davomat — butun guruh bir ekranda.

8. **Ish beruvchi** — `/kirish` → «Ish beruvchi». So'rov va qidiruv. Usta telefoni chiqmaydi.

9. **Hokimlik** — `/kirish` → «Hokimlik». http://localhost:8090/kabinet/hisobot — tuman kesimidagi raqamlar.

Yopish: «Ariza bepul. Yo'lni tizim taklif qiladi, xodim tasdiqlaydi.»
