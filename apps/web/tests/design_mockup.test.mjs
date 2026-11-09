import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ap = "(?:'|&apos;)";

test("Screen 1: Bosh sahifa (ommaviy portal) matches design mockup", async () => {
  const homeCode = await readFile(new URL("../components/home/HomeExperience.tsx", import.meta.url), "utf8");
  assert.match(homeCode, new RegExp(`Uychida zamonaviy usta kasbini egallang`));
  assert.match(homeCode, new RegExp(`ish va daromadga`));
  assert.match(homeCode, new RegExp(`O${ap}qish, sertifikat, QR pasport va ishga joylashish — bitta platformada`));
  assert.match(homeCode, new RegExp(`Onlayn ariza berish →`));
  assert.match(homeCode, new RegExp(`Loyiha haqida`));
  assert.match(homeCode, /3200/);
  assert.match(homeCode, /1950/);
  assert.match(homeCode, /1480/);
  assert.match(homeCode, /820/);
  assert.match(homeCode, /120/);
  assert.match(homeCode, new RegExp(`Platforma ishlash jarayoni`));
  assert.match(homeCode, new RegExp(`12 ta talabgir kasb`));
  assert.match(homeCode, new RegExp(`1000 so${ap}zli lug${ap}at va til o${ap}rganish`));
  assert.match(homeCode, new RegExp(`QR asosidagi raqamli pasport`));
  assert.match(homeCode, new RegExp(`Balans tamoyili`));
});

test("Screen 2: Kasblar katalogi matches design mockup", async () => {
  const tradesCode = await readFile(new URL("../app/kasblar/page.tsx", import.meta.url), "utf8");
  assert.match(tradesCode, new RegExp(`12 ta ustalik kasbi`));
  assert.match(tradesCode, new RegExp(`Ichki va xorijiy mehnat bozori uchun eng talabgir qurilish kasblari`));
  assert.match(tradesCode, new RegExp(`Kasb nomini qidirish`));
  assert.match(tradesCode, new RegExp(`G${ap}isht teruvchi`));
  assert.match(tradesCode, new RegExp(`Elektromontyor`));
  assert.match(tradesCode, new RegExp(`Payvandchi`));
  assert.match(tradesCode, new RegExp(`Santexnik`));
  assert.match(tradesCode, /groups: 16/);
  assert.match(tradesCode, /\{trade\.groups\} guruh/);
});

test("Screen 3: Onlayn ariza berish matches design mockup", async () => {
  const applyCode = await readFile(new URL("../app/ariza/page.tsx", import.meta.url), "utf8");
  assert.match(applyCode, new RegExp(`Shaxsiy ma${ap}lumotlar`));
  assert.match(applyCode, new RegExp(`Kasb tanlash`));
  assert.match(applyCode, new RegExp(`Tasdiqlash`));
  assert.match(applyCode, new RegExp(`O${ap}qish uchun onlayn ariza bering`));
  assert.match(applyCode, new RegExp(`Tez va qulay`));
  assert.match(applyCode, new RegExp(`Bepul o${ap}qish`));
  assert.match(applyCode, new RegExp(`Sertifikat va QR pasport`));
  assert.match(applyCode, new RegExp(`Ishga yo${ap}naltirish`));
  assert.match(applyCode, new RegExp(`F\\.I\\.SH\\.`));
  assert.match(applyCode, new RegExp(`Telefon raqam`));
  assert.match(applyCode, new RegExp(`Tug${ap}ilgan sana`));
  assert.match(applyCode, new RegExp(`Mahalla`));
  assert.match(applyCode, new RegExp(`Keyingi bosqich →`));
});

test("Screen 4: Xorijiy ish beruvchi portali (EN) matches design mockup", async () => {
  const employerCode = await readFile(new URL("../app/ish-beruvchilar/page.tsx", import.meta.url), "utf8");
  assert.match(employerCode, new RegExp(`Find Verified Construction Professionals from Uzbekistan`));
  assert.match(employerCode, new RegExp(`Certified workers \\(QR\\)`));
  assert.match(employerCode, new RegExp(`Ready-to-work brigades`));
  assert.match(employerCode, new RegExp(`Multilingual profiles`));
  assert.match(employerCode, new RegExp(`Fast hiring process`));
  assert.match(employerCode, new RegExp(`Request Workers →`));
  assert.match(employerCode, new RegExp(`Browse Candidates`));
  assert.match(employerCode, /1 480\+/);
  assert.match(employerCode, /120\+/);
  assert.match(employerCode, /12/);
  assert.match(employerCode, /3–5 days/);
});

test("Screen 5: Tinglovchi (o'quvchi) kabineti matches design mockup", async () => {
  const studentCode = await readFile(new URL("../app/kabinet/page.tsx", import.meta.url), "utf8");
  assert.match(studentCode, new RegExp(`Mening o${ap}quv jarayonim`));
  assert.match(studentCode, new RegExp(`G${ap}isht teruvchi`));
  assert.match(studentCode, new RegExp(`O${ap}qish davom etmoqda`));
  assert.match(studentCode, /75%/);
  assert.match(studentCode, new RegExp(`O${ap}quv jadvali \\(ushbu hafta\\)`));
  assert.match(studentCode, /10-noy/);
  assert.match(studentCode, new RegExp(`Lug${ap}at \\(1000 so${ap}z\\)`));
  assert.match(studentCode, new RegExp(`Testlar natijasi`));
  assert.match(studentCode, /92%/);
  assert.match(studentCode, new RegExp(`Topshiriqlar`));
  assert.match(studentCode, /3 ta/);
});

test("Screen 6: 1000 so'z'li lug'at moduli matches design mockup", async () => {
  const vocabCode = await readFile(new URL("../app/kabinet/lugat/page.tsx", import.meta.url), "utf8");
  assert.match(vocabCode, new RegExp(`Lug${ap}at — 1000 so${ap}z`));
  assert.match(vocabCode, new RegExp(`O${ap}zbek — Inglizcha`));
  assert.match(vocabCode, new RegExp(`Ruscha`));
  assert.match(vocabCode, new RegExp(`Nemischa`));
  assert.match(vocabCode, new RegExp(`1000 so${ap}z`));
  assert.match(vocabCode, new RegExp(`G${ap}isht`));
  assert.match(vocabCode, new RegExp(`Brick`));
  assert.match(vocabCode, new RegExp(`brik`));
  assert.match(vocabCode, new RegExp(`Yodlash`));
  assert.match(vocabCode, new RegExp(`Mashq`));
  assert.match(vocabCode, new RegExp(`Test`));
});

test("Screen 7: Usta profili va QR ishchi pasporti matches design mockup", async () => {
  const workerCode = await readFile(new URL("../app/ustalar/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(workerCode, new RegExp(`QR Ishchi pasporti`));
  assert.match(workerCode, new RegExp(`Tasdiqlangan`));
  assert.match(workerCode, new RegExp(`Abdullayev Jahongir`));
  assert.match(workerCode, new RegExp(`Usta \\(g${ap}isht teruvchi\\)`));
  assert.match(workerCode, new RegExp(`III daraja`));
  assert.match(workerCode, new RegExp(`3 yil`));
  assert.match(workerCode, new RegExp(`UB-2025-0148`));
  assert.match(workerCode, new RegExp(`2029-11-01`));
  assert.match(workerCode, new RegExp(`Sertifikat \\(PDF\\)`));
  assert.match(workerCode, new RegExp(`Ma${ap}lumotni tekshirish`));
});

test("Screen 8: Hokimlik / Administrator paneli matches design mockup", async () => {
  const adminCode = await readFile(new URL("../app/kabinet/page.tsx", import.meta.url), "utf8");
  assert.match(adminCode, new RegExp(`Asosiy ko${ap}rsatkichlar \\(KPI\\)`));
  assert.match(adminCode, /3 200/);
  assert.match(adminCode, /\+34%/);
  assert.match(adminCode, /1 950/);
  assert.match(adminCode, /\+18%/);
  assert.match(adminCode, /1 480/);
  assert.match(adminCode, /\+42%/);
  assert.match(adminCode, /820/);
  assert.match(adminCode, /\+37%/);

  const chartsCode = await readFile(new URL("../components/cabinet/AdminCharts.tsx", import.meta.url), "utf8");
  assert.match(chartsCode, new RegExp(`Arizalar dinamikasi`));
  assert.match(chartsCode, new RegExp(`Tinglovchilar \\(kasb bo${ap}yicha\\)`));
  assert.match(chartsCode, /1 950/);
  assert.match(chartsCode, new RegExp(`G${ap}isht teruvchi`));
  assert.match(chartsCode, /25%/);
  assert.match(chartsCode, new RegExp(`Elektromontyor`));
  assert.match(chartsCode, /15%/);
});
