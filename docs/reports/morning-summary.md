# Ertalabki xulosa — taqdimot

Sayt ishlayapti: http://localhost:8090

Orqaga qaytish: `git checkout pre-redesign`

## Nima o'zgardi

- Bosh sahifa qayta chizildi: katta sarlavha, qidiruv, 3D bino, raqamlar, 4 qadam, balans, 12 kasb, QR telefon, yo'nalishlar, hamkorlar, yakuniy chaqiruv. http://localhost:8090
- Menyu ixcham: Loyiha, Kasblar, Ustalar, Ish beruvchilar va «Yana».
- Tekshiruv varaqasi: yashil HAQIQIY muhr. http://localhost:8090/verify/UB-2026-000001
- Kabinet paneli: KPI kartalar va voronka grafigi. http://localhost:8090/kabinet
- `/kirish` da «Demo kirish»: Administrator, Ustoz, Tinglovchi, Ish beruvchi, Ishlab chiqaruvchi, Hokimlik. Faqat `DEMO_MODE=true` da.
- Ssenariy: `docs/reports/demo-script.md`
- Suratlar: `docs/reports/screens/` (home-desktop, home-mobile, verify, admin-dashboard)

## Testlar

- API: 35 o'tdi, 0 yiqildi.
- Web: 3 o'tdi, 0 yiqildi.
- Ochiq sahifalar va `/kabinet`: HTTP 200.
- 390 px da bosh sahifa gorizontal toshmadi.

## To'xtagan

- Lighthouse balli o'lchanmadi. `docs/reports/blocked.md`
- 3D sahna aylanadigan qavatli bino. Aylantirish scrollga bog'lanmagan, derazalar yonmaydi. Telefonda statik chizma turadi.
- Ichki sahifalar yangi menyu va tipografiyani oladi. Har birining o'z maketi bosh sahifa darajasida qayta chizilmagan.

## Ertalab birinchi

1. http://localhost:8090 ni to'liq ekranda oching.
2. `docs/reports/demo-script.md` bo'yicha yuring.
3. Admin uchun `/kirish` → Administrator. Ikkinchi kod so'ralmaydi, chunki demo tugmasi 2FA ni chetlab o'tadi.
