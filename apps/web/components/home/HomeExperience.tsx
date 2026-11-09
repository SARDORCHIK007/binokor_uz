"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomePayload } from "@/lib/public";
import { Icon } from "@/components/brand/Icon";
import { TradeTile } from "@/components/home/TradeTile";

const steps = [
  { id: 1, title: "Mahalla ro'yxati va tavsiyasi", desc: "Mahalla yoshlari va ishsiz fuqarolar reyestri", icon: "users" as const },
  { id: 2, title: "Ariza va tanlov", desc: "3 qadamda onlayn ariza va balans matritsasi", icon: "doc" as const },
  { id: 3, title: "O'qish (ustoz-shogird)", desc: "20% nazariya, 30% ustaxona, 50% real obyekt", icon: "cap" as const },
  { id: 4, title: "Sertifikat va QR pasport", desc: "Raqamli imzolangan rasmiy QR pasport", icon: "award" as const },
  { id: 5, title: "Ish beruvchi so'rovi", desc: "Ichki kompaniyalar va xorijiy agentliklar", icon: "briefcase" as const },
  { id: 6, title: "Ishga joylashish", desc: "Usta yoki tayyor brigada sifatida shartnoma", icon: "handshake" as const },
  { id: 7, title: "Natija va baholash", desc: "Ish beruvchi bahosi, reyting va kafolat", icon: "chart" as const },
];

const highlights = [
  "12 ta talabgir kasb",
  "1000 so'zli lug'at va til o'rganish",
  "QR asosidagi raqamli pasport",
  "Ichki va xorijiy mehnat bozori",
  "Hokimlik uchun KPI va tahlil",
  "Mobil qulay (PWA)",
  "AI yordamchi va smart tavsiyalar",
];

const balanceMatrix = [
  { key: "A", title: "A toifa — Hunari bor, tili yo'q", action: "Faqat maqsadli til o'rgatiladi (Germaniya, Yaponiya, Koreya)", time: "3-6 oy" },
  { key: "B", title: "B toifa — Tili bor (≥B1), kasbi yo'q", action: "Tezlashtirilgan kasb o'rgatiladi, brigadir yoki kurator bo'ladi", time: "3-6 oy" },
  { key: "C", title: "C toifa — Hunari ham, tili ham yo'q", action: "Ichki trekda kasb o'rgatiladi (Uychi va viloyat obyektlariga)", time: "3-6 oy" },
  { key: "D", title: "D toifa — Hunari ham, tili ham bor", action: "Malaka sertifikati va QR pasport rasmiylashtirilib, xorijga yuboriladi", time: "1 oy" },
];

export function HomeExperience({ home }: { home: HomePayload }) {
  const [activeMatrix, setActiveMatrix] = useState<string>("A");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = [
    { key: "applicants", label: "Arizachilar", value: home.stats.applicants ?? 0, suffix: "" },
    { key: "listeners", label: "Tinglovchilar", value: home.stats.listeners ?? 0, suffix: "" },
    { key: "certified", label: "Sertifikatlar", value: home.stats.certified ?? 0, suffix: "" },
    { key: "employed", label: "Ishga joylashgan", value: home.stats.employed ?? 0, suffix: "" },
    { key: "foreign_employers", label: "Xorijiy ish beruvchilar", value: home.stats.foreign_employers ?? 0, suffix: "" },
  ];

  return (
    <div className="bg-surface-100 text-navy-900">
      {/* 1. HERO BLOCK */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <img
          src="/media/hero/site.jpg"
          alt=""
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[60%] object-cover object-center opacity-40 lg:block"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/40" />

        {/* Hero worker portrait - yellow helmet */}
        <div className="pointer-events-none absolute right-4 bottom-0 hidden h-[90%] w-[42%] max-w-[500px] overflow-hidden lg:block">
          <img
            src="/media/hero/hero-student.jpg"
            alt="Uychi binokor ustasi"
            className="h-full w-full rounded-t-3xl object-cover object-top drop-shadow-2xl ring-4 ring-accent/30"
          />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20 lg:pb-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/30">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              Uychi tumani hokimligi rasmiy loyihasi
            </span>

            <h1 className="mt-4 text-[38px] leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-[48px] lg:text-[56px]">
              Uychida zamonaviy usta kasbini egallang,{" "}
              <span className="text-accent">ish va daromadga</span> ega bo&apos;ling!
            </h1>

            <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
              O&apos;qish, sertifikat, QR pasport va ishga joylashish — bitta platformada.
            </p>

            {/* Katta qidiruv qatori */}
            <form action="/qidiruv" method="GET" className="mt-7 flex max-w-xl flex-col gap-2 rounded-2xl bg-white/10 p-2 backdrop-blur sm:flex-row ring-1 ring-white/15">
              <input
                type="text"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Usta, sertifikat raqami (masalan: UB-2026-000001) yoki kasb..."
                className="h-12 flex-1 rounded-xl bg-white px-4 text-sm font-medium text-navy-900 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover transition"
              >
                Qidirish
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/ariza"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-bold text-navy-900 shadow-lg shadow-accent/20 hover:bg-accent-hover transition transform hover:-translate-y-0.5"
              >
                Onlayn ariza berish →
              </Link>
              <Link
                href="/loyiha"
                className="rounded-full border border-white/40 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition"
              >
                Loyiha haqida
              </Link>
            </div>
          </div>

          {/* KPI tasmasi - Dizayndagi 5 ta ko'rsatkich */}
          <div className="mt-14 rounded-2xl bg-[#0b1f3a]/90 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur lg:mt-20">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-white/10">
              {stats.map((stat) => (
                <div key={stat.key} className="pt-3 sm:pt-0 lg:px-4 first:pt-0">
                  <dd className="text-3xl font-extrabold text-white tracking-tight tabular-nums sm:text-4xl">
                    {stat.value.toLocaleString()} {stat.suffix}
                  </dd>
                  <dt className="mt-1 text-xs font-medium text-faint uppercase tracking-wider">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 2. KASBLAR KATALOGI PREVIEW */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Bo&apos;lajak kasbingiz</span>
            <h2 className="mt-1 text-3xl font-extrabold text-navy-900 sm:text-4xl">12 ta ustalik kasbi</h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Ichki va xorijiy mehnat bozori uchun eng talabgir qurilish kasblari
            </p>
          </div>
          <Link
            href="/kasblar"
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            Barcha 12 ta kasb →
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {home.trades.slice(0, 6).map((trade, index) => (
            <li key={trade.code}>
              <TradeTile trade={trade} index={index} />
            </li>
          ))}
        </ul>
      </section>

      {/* 3. PLATFORMA ISHLASH JARAYONI (7 QADAM) */}
      <section className="bg-white py-16 border-y border-line">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Boshidan oxirigacha</span>
            <h2 className="mt-1 text-3xl font-extrabold text-navy-900 sm:text-4xl">Platforma ishlash jarayoni</h2>
            <p className="mt-2 text-sm text-muted">
              Mahalladan boshlanib, rasmiy ish o&apos;rnigacha bo&apos;lgan har bir qadam raqamlashtirilgan
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st) => (
              <div
                key={st.id}
                className="relative flex flex-col justify-between rounded-2xl border border-line bg-canvas p-5 transition hover:border-primary hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                    {st.id}
                  </span>
                  <span className="size-2 rounded-full bg-success-600" />
                </div>
                <div className="mt-4">
                  <h3 className="font-bold text-navy-900 text-base">{st.title}</h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BALANS TAMOYILI (2x2 MATRITSA) */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-8 sm:p-12">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Adolatli taqsimot</span>
            <h2 className="mt-2 text-3xl font-extrabold text-navy-900 sm:text-4xl">Balans tamoyili: Kasb va Til integratsiyasi</h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              Til bilganga hunar o&apos;rgatamiz, hunar bilganga til o&apos;rgatamiz. Hech bir yosh e&apos;tibordan chetda qolmaydi.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {balanceMatrix.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveMatrix(item.key)}
                className={`text-left rounded-2xl p-5 transition border text-sm ${
                  activeMatrix === item.key
                    ? "border-primary bg-white shadow-sh2 ring-2 ring-primary/15"
                    : "border-line bg-white/70 hover:border-primary/40 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-900 text-base">{item.title}</span>
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-navy-900">
                    {item.time}
                  </span>
                </div>
                <p className="mt-3 text-muted text-xs sm:text-sm leading-relaxed">{item.action}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ASOSIY AFZALLIKLAR VA TIZIM IMKONIYATLARI */}
      <section className="bg-white py-16 border-t border-line">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Ekotizim afzalliklari</span>
              <h2 className="mt-2 text-3xl font-extrabold text-navy-900 sm:text-4xl">
                Kasb, malaka va ish — yagona raqamli ekotizim
              </h2>
              <p className="mt-3 text-sm text-muted sm:text-base leading-relaxed">
                Platforma Uychi tumani yoshlarining mahalladan boshlab, xalqaro maydondagi nufuzli ob&apos;ektlargacha
                bo&apos;lgan yo&apos;lini to&apos;liq shaffof va ishonchli ta&apos;minlaydi.
              </p>

              <ul className="mt-8 space-y-3.5">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base font-semibold text-navy-900">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-600 text-white text-xs">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/ariza"
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover transition"
                >
                  Hoziroq ariza topshiring
                </Link>
                <Link
                  href="/ish-beruvchilar"
                  className="rounded-xl border border-navy-900 px-6 py-3 text-sm font-bold text-navy-900 hover:bg-navy-900 hover:text-white transition"
                >
                  Ish beruvchilar uchun
                </Link>
              </div>
            </div>

            {/* Platforma qurilmalardagi preview */}
            <div className="relative rounded-3xl border border-line bg-canvas p-8 shadow-sh2">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-danger-600/70" />
                  <span className="size-3 rounded-full bg-accent" />
                  <span className="size-3 rounded-full bg-success-600/70" />
                </div>
                <span className="text-xs font-mono text-faint">uychibinokor.uz/kabinet</span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-line bg-card p-4">
                  <p className="text-xs font-semibold text-primary">Jonli holat</p>
                  <p className="text-lg font-bold text-navy-900 mt-1">QR Ishchi pasporti tizimi faol</p>
                  <p className="text-xs text-muted mt-1">Har bir bitiruvchi uchun Ed25519 raqamli imzo va tekshirish kodi yaratiladi.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-success-600/25 bg-success-100 p-4">
                    <span className="text-2xl font-extrabold text-success-600">100%</span>
                    <p className="text-xs text-muted mt-1">QR tekshiruv shaffofligi</p>
                  </div>
                  <div className="rounded-xl border border-accent/40 bg-amber-100 p-4">
                    <span className="text-2xl font-extrabold text-warning-600">0 so&apos;m</span>
                    <p className="text-xs text-muted mt-1">Ish izlovchidan to&apos;lov olinmaydi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HAMKORLAR TASMASI */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Rasmiy hamkorlik</span>
          <h2 className="mt-1 text-2xl font-extrabold text-navy-900 sm:text-3xl">Davlat va ta&apos;lim muassasalari hamkorligi</h2>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {home.partners.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 shadow-sh2 border border-line"
            >
              <span className="size-2 rounded-full bg-success-600" />
              <span className="text-sm font-semibold text-navy-900">{p.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
