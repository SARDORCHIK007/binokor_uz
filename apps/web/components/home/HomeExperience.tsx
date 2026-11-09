"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import type { HomePayload } from "@/lib/public";
import { TradeTile } from "@/components/home/TradeTile";

const steps = [1, 2, 3, 4, 5, 6, 7] as const;

const highlights = [1, 2, 3, 4, 5, 6, 7] as const;

const balanceMatrix = [
  { key: "A", time: "months36" },
  { key: "B", time: "months36" },
  { key: "C", time: "months36" },
  { key: "D", time: "months1" },
] as const;

export function HomeExperience({ home }: { home: HomePayload }) {
  const t = useTranslations("landing");
  const [activeMatrix, setActiveMatrix] = useState<string>("A");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = [
    { key: "applicants", label: t("stat.applicants"), value: home.stats.applicants ?? 0, suffix: "" },
    { key: "listeners", label: t("stat.listeners"), value: home.stats.listeners ?? 0, suffix: "" },
    { key: "certified", label: t("stat.certified"), value: home.stats.certified ?? 0, suffix: "" },
    { key: "employed", label: t("stat.employed"), value: home.stats.employed ?? 0, suffix: "" },
    { key: "foreign_employers", label: t("stat.foreign_employers"), value: home.stats.foreign_employers ?? 0, suffix: "" },
  ];

  return (
    <div className="bg-surface-100 text-navy-900">
      {/* 1. HERO BLOCK */}
      <section className="relative overflow-hidden bg-navy-900 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/hero/site.webp"
          alt=""
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[60%] object-cover object-center opacity-40 lg:block"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/40" />

        {/* Hero worker portrait — transparent PNG standing on the hero background */}
        <div className="pointer-events-none absolute right-0 bottom-0 hidden h-[94%] w-[44%] max-w-[560px] lg:block xl:right-6">
          <div className="absolute bottom-0 left-1/2 h-[70%] w-[85%] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/hero/hero-student.webp"
            alt={t("workerAlt")}
            className="relative h-full w-full object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
          />
        </div>

        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-12 lg:pt-20 lg:pb-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-1.5 text-xs font-semibold text-accent ring-1 ring-accent/30">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              {t("badge")}
            </span>

            <h1 className="mt-4 text-[38px] leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-[48px] lg:text-[56px]">
              {t("heroA")}{" "}
              <span className="text-accent">{t("heroAccent")}</span>
              {/^[!?.]/.test(t("heroB")) ? "" : " "}
              {t("heroB")}
            </h1>

            <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
              {t("heroText")}
            </p>

            {/* Katta qidiruv qatori */}
            <form action="/qidiruv" method="GET" className="mt-7 flex max-w-xl flex-col gap-2 rounded-2xl bg-navy-800 p-2 sm:flex-row ring-1 ring-white/15">
              <input
                type="text"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("search")}
                className="h-12 flex-1 rounded-xl bg-white px-4 text-sm font-medium text-navy-900 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover transition"
              >
                {t("search")}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/ariza"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-base font-bold text-navy-900 shadow-lg shadow-accent/20 hover:bg-accent-hover transition transform hover:-translate-y-0.5"
              >
                {t("apply")}
              </Link>
              <Link
                href="/loyiha"
                className="rounded-full border border-white/40 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition"
              >
                {t("about")}
              </Link>
            </div>
          </div>

          {/* KPI tasmasi - Dizayndagi 5 ta ko'rsatkich */}
          <div className="mt-14 rounded-2xl bg-navy-800/90 p-5 shadow-2xl ring-1 ring-white/10 backdrop-blur lg:mt-20">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-white/10">
              {stats.map((stat) => (
                <div key={stat.key} className="pt-3 sm:pt-0 lg:px-4 first:pt-0">
                  <dd className="text-3xl font-extrabold text-white tracking-tight tabular-nums sm:text-4xl">
                    {stat.value > 0 ? stat.value.toLocaleString("ru-RU") : "—"} {stat.suffix}
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
            <span className="text-xs font-bold uppercase tracking-wider text-primary">{t("tradesEyebrow")}</span>
            <h2 className="mt-1 text-3xl font-extrabold text-navy-900 sm:text-4xl">{home.trades.length} {t("tradesTitleSuffix")}</h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              {t("tradesText")}
            </p>
          </div>
          <Link
            href="/kasblar"
            className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            {t("tradesAll")}
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
            <span className="text-xs font-bold uppercase tracking-wider text-primary">{t("stepsEyebrow")}</span>
            <h2 className="mt-1 text-3xl font-extrabold text-navy-900 sm:text-4xl">{t("stepsTitle")}</h2>
            <p className="mt-2 text-sm text-muted">
              {t("stepsText")}
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((id) => (
              <div
                key={id}
                className="relative flex flex-col justify-between rounded-2xl border border-line bg-canvas p-5 transition hover:border-primary hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
                    {id}
                  </span>
                  <span className="size-2 rounded-full bg-success-600" />
                </div>
                <div className="mt-4">
                  <h3 className="font-bold text-navy-900 text-base">{t(`step${id}`)}</h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{t(`step${id}d`)}</p>
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
            <span className="text-xs font-bold uppercase tracking-wider text-primary">{t("balanceEyebrow")}</span>
            <h2 className="mt-2 text-3xl font-extrabold text-navy-900 sm:text-4xl">{t("balanceTitle")}</h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              {t("balanceText")}
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
                  <span className="font-bold text-navy-900 text-base">{t(`matrix${item.key}`)}</span>
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-navy-900">
                    {t(item.time)}
                  </span>
                </div>
                <p className="mt-3 text-muted text-xs sm:text-sm leading-relaxed">{t(`matrix${item.key}d`)}</p>
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
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{t("ecoEyebrow")}</span>
              <h2 className="mt-2 text-3xl font-extrabold text-navy-900 sm:text-4xl">
                {t("ecoTitle")}
              </h2>
              <p className="mt-3 text-sm text-muted sm:text-base leading-relaxed">
                {t("ecoText")}
              </p>

              <ul className="mt-8 space-y-3.5">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm sm:text-base font-semibold text-navy-900">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-600 text-white text-xs">
                      ✓
                    </span>
                    {t(`hl${item}`)}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/ariza"
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-primary-hover transition"
                >
                  {t("ctaApply")}
                </Link>
                <Link
                  href="/ish-beruvchilar"
                  className="rounded-xl border border-navy-900 px-6 py-3 text-sm font-bold text-navy-900 hover:bg-navy-900 hover:text-white transition"
                >
                  {t("ctaEmployers")}
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
                  <p className="text-xs font-semibold text-primary">{t("live")}</p>
                  <p className="text-lg font-bold text-navy-900 mt-1">{t("liveTitle")}</p>
                  <p className="text-xs text-muted mt-1">{t("liveText")}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-success-600/25 bg-success-100 p-4">
                    <span className="text-2xl font-extrabold text-success-600">QR</span>
                    <p className="text-xs text-muted mt-1">{t("qrOpen")}</p>
                  </div>
                  <div className="rounded-xl border border-accent/40 bg-amber-100 p-4">
                    <span className="text-2xl font-extrabold text-warning-600">{t("free")}</span>
                    <p className="text-xs text-muted mt-1">{t("freeText")}</p>
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
          <span className="text-xs font-bold uppercase tracking-wider text-primary">{t("partnersEyebrow")}</span>
          <h2 className="mt-1 text-2xl font-extrabold text-navy-900 sm:text-3xl">{t("partnersTitle")}</h2>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {home.partners.filter((p) => p.status === "SIGNED").map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2 rounded-2xl border border-line bg-card px-5 py-3 shadow-sh1"
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
