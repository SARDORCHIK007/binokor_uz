"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BuildingPoster } from "@/components/BuildingPoster";
import { TradeMark } from "@/components/home/TradeMark";
import type { HomePayload } from "@/lib/public";

const BuildingScene = dynamic(() => import("@/components/home/BuildingScene").then((mod) => mod.BuildingScene), {
  ssr: false,
});

const steps = ["mahalla", "study", "certificate", "work"] as const;
const balance = ["langOnly", "tradeOnly", "neither", "both"] as const;

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      setShown(Math.round(value * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, value]);
  return <span className="tabular-nums">{shown}</span>;
}

export function HomeExperience({ home, photos }: { home: HomePayload; photos: string[] }) {
  const t = useTranslations();
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(false);
  useEffect(() => {
    const weak = window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 768;
    const saveData = "connection" in navigator && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    setScene(!weak && !saveData);
  }, []);
  const rise = reduce ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.45 } };
  const stats = (
    [
      ["listeners", home.stats.listeners ?? 0],
      ["certified", home.stats.certified ?? 0],
      ["employed", home.stats.employed ?? 0],
      ["sites", home.stats.sites ?? 0],
    ] as const
  ).filter(([, value]) => value > 0);
  return (
    <div>
      <section className="bg-[#F4F6F9]">
        <div className="mx-auto grid min-h-[100svh] max-w-[1200px] items-center gap-10 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="max-w-[14ch] text-[40px] leading-[1.02] font-bold tracking-[-0.03em] text-navy-900 lg:text-[80px]">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-6 max-w-[36ch] text-lg text-muted">{t("home.heroText")}</p>
            <form action="/qidiruv" className="mt-8 flex flex-col gap-2 rounded-lg bg-white p-2 shadow-sh2 sm:flex-row">
              <label className="sr-only" htmlFor="q">{t("home.searchLabel")}</label>
              <input id="q" name="q" placeholder={t("home.searchPlaceholder")} className="min-h-14 flex-1 rounded-md px-4 text-base outline-none" />
              <button className="min-h-14 rounded-md bg-amber-600 px-6 font-semibold text-white" type="submit">{t("home.searchAction")}</button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/ariza" className="rounded-lg bg-navy-900 px-5 py-3 font-medium text-white">{t("home.apply")}</Link>
              <Link href="/ustalar" className="rounded-lg border border-navy-900 px-5 py-3 font-medium text-navy-900">{t("home.findWorker")}</Link>
            </div>
          </div>
          <div className="relative h-[420px] overflow-hidden rounded-[20px] bg-navy-900 shadow-sh3 lg:h-[560px]">
            {scene ? <BuildingScene /> : <BuildingPoster caption={t("home.posterCaption")} />}
          </div>
        </div>
      </section>

      {stats.length > 0 ? (
        <section className="bg-navy-900 py-16 text-white">
          <dl className="mx-auto grid max-w-[1200px] grid-cols-2 gap-8 px-4 lg:grid-cols-4">
            {stats.map(([key, value]) => (
              <div key={key}>
                <dd className="text-5xl font-bold tracking-[-0.03em]"><CountUp value={value} /></dd>
                <dt className="mt-2 text-sm text-blue-100">{t(`home.${key}`)}</dt>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1200px] px-4 py-20">
        <h2 className="text-4xl font-bold tracking-[-0.03em] text-navy-900">{t("home.modelTitle")}</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <motion.li key={step} className="rounded-[20px] bg-white p-6 shadow-sh2" {...rise} transition={{ delay: index * 0.08 }}>
              <p className="text-sm font-semibold text-amber-600">0{index + 1}</p>
              <h3 className="mt-3 text-2xl font-bold">{t(`steps.${step}`)}</h3>
              <p className="mt-2 text-sm text-muted">{t(`steps.${step}Text`)}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-navy-900">{t("home.balanceTitle")}</h2>
          <p className="mt-3 max-w-xl text-muted">{t("home.balanceText")}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {balance.map((item) => (
              <article key={item} className="group rounded-[20px] border border-line bg-[#F4F6F9] p-6 transition-transform hover:-translate-y-1">
                <h3 className="text-xl font-bold">{t(`balance.${item}`)}</h3>
                <p className="mt-3 text-muted">{t(`balance.${item}Text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-20">
        <h2 className="text-4xl font-bold tracking-[-0.03em] text-navy-900">{t("home.tradesTitle")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {home.trades.map((trade) => (
            <Link key={trade.code} href={`/kasblar/${trade.code}`} className="rounded-[20px] bg-white p-5 shadow-sh2 transition-transform hover:-translate-y-1">
              <TradeMark code={trade.code} />
              <h3 className="mt-4 text-xl font-bold">{trade.name}</h3>
              <p className="mt-2 text-sm text-muted">{t("home.domestic")}: {trade.domestic_months} {t("home.months")}</p>
              <p className="text-sm text-muted">{t("home.foreign")}: {trade.domestic_months + trade.foreign_lang_months} {t("home.months")}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-navy-900 py-20 text-white">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold tracking-[-0.03em]">{t("home.scanTitle")}</h2>
            <p className="mt-4 max-w-md text-blue-100">{t("home.scanText")}</p>
            <Link href="/verify/UB-2026-000001" className="mt-6 inline-block rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white">UB-2026-000001</Link>
          </div>
          <Link href="/verify/UB-2026-000001" className="mx-auto block w-[240px] rounded-[32px] border-8 border-[#13294B] bg-white p-4 text-navy-900 shadow-sh3">
            <div className="relative h-40 overflow-hidden rounded-2xl bg-[#F4F6F9]">
              <div className="scan-line absolute inset-x-4 h-0.5 bg-teal-600" />
              <p className="absolute bottom-4 left-4 text-xs font-semibold text-teal-700">HAQIQIY</p>
            </div>
            <p className="mt-3 text-sm font-semibold">UB-2026-000001</p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-20">
        <h2 className="text-4xl font-bold tracking-[-0.03em] text-navy-900">{t("home.destinationsTitle")}</h2>
        <p className="mt-3 max-w-xl text-muted">{t("home.destinationsText")}</p>
        <div className="relative mt-8 overflow-hidden rounded-[20px] bg-navy-900 p-6 text-white">
          <svg viewBox="0 0 640 280" className="h-56 w-full" aria-hidden="true">
            <circle cx="90" cy="150" r="6" fill="#C27A00" />
            {home.destinations.map((item, index) => {
              const x = 180 + (index % 6) * 75;
              const y = 60 + (index % 3) * 70;
              return (
                <g key={item.code}>
                  <path d={`M90 150 Q ${(90 + x) / 2} ${y - 40} ${x} ${y}`} fill="none" stroke="#3B7BC4" strokeWidth="1.5" className="arc" />
                  <circle cx={x} cy={y} r="4" fill="#E7EEF7" />
                </g>
              );
            })}
          </svg>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {home.destinations.map((item) => (
              <li key={item.code}>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-blue-100">{item.language}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 className="text-3xl font-bold text-navy-900">{t("home.uychiTitle")}</h2>
          <p className="mt-2 text-muted">{t("home.uychiText")}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {photos.length > 0
              ? photos.slice(0, 3).map((photo) => (
                  <img key={photo} src={`/media/real/${photo}`} alt="" className="h-48 w-full rounded-[20px] object-cover" />
                ))
              : ["#1c3a66", "#2563a8", "#2f7d6d"].map((color) => <div key={color} className="h-48 rounded-[20px]" style={{ background: color }} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-16">
        <h2 className="text-3xl font-bold text-navy-900">{t("home.partnersTitle")}</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">{t("home.partnersText")}</p>
        <ul className="mt-6 flex flex-wrap gap-3">
          {home.partners.map((partner) => (
            <li key={partner.name} className="rounded-full bg-white px-4 py-2 text-sm shadow-sh1">
              <span className={partner.show_logo ? "font-bold text-navy-900" : "text-muted"}>{partner.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-navy-900 py-20 text-white">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 className="max-w-[16ch] text-4xl font-bold tracking-[-0.03em] lg:text-6xl">{t("home.finalTitle")}</h2>
          <p className="mt-4 max-w-lg text-blue-100">{t("home.finalText")}</p>
          <Link href="/ariza" className="mt-8 inline-block rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white">{t("home.apply")}</Link>
        </div>
      </section>
      <style>{`
        .scan-line { animation: scan 2.4s ease-in-out infinite; }
        .arc { stroke-dasharray: 8 6; animation: dash 8s linear infinite; }
        @keyframes scan { from { top: 12px; } to { top: 140px; } }
        @keyframes dash { to { stroke-dashoffset: -80; } }
        @media (prefers-reduced-motion: reduce) { .scan-line, .arc { animation: none; } }
      `}</style>
    </div>
  );
}
