"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3 text-base text-navy-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function num(value: string): number {
  const parsed = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Quantity helper: area x consumption norm x (1 + reserve). The norm and the price are entered by the person; nothing is assumed. */
export function MaterialCalculator() {
  const t = useTranslations("calc");
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState("");
  const [norm, setNorm] = useState("");
  const [reserve, setReserve] = useState("10");
  const [price, setPrice] = useState("");

  const base = num(area) * num(norm);
  const needed = base * (1 + Number(reserve || 0) / 100);
  const ready = base > 0;
  const quantity = Math.ceil(needed);
  const format = (value: number) => value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

  return (
    <section className="mt-8 rounded-2xl border border-line bg-card p-5 shadow-sh1" aria-labelledby="calc-title">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span id="calc-title" className="block text-lg font-extrabold text-navy-900">
            {t("title")}
          </span>
          <span className="block text-sm text-muted">{t("text")}</span>
        </span>
        <span aria-hidden="true" className={`text-lg text-muted transition ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>
      {open ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("area")}
              <input inputMode="decimal" value={area} onChange={(event) => setArea(event.target.value)} className={FIELD} placeholder="120" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("norm")}
              <input inputMode="decimal" value={norm} onChange={(event) => setNorm(event.target.value)} className={FIELD} placeholder="0.25" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("reserve")}
              <input inputMode="decimal" value={reserve} onChange={(event) => setReserve(event.target.value)} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("price")}
              <input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} className={FIELD} />
            </label>
            <p className="text-xs text-muted sm:col-span-2">{t("normNote")}</p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-blue-50 p-5" aria-live="polite">
            {ready ? (
              <>
                <p className="text-sm font-semibold text-muted">{t("result")}</p>
                <p className="mt-1 text-4xl font-extrabold text-navy-900 tabular-nums">{format(quantity)}</p>
                <p className="mt-1 text-xs text-muted">{t("breakdown", { base: format(base), reserve: Number(reserve || 0) })}</p>
                {num(price) > 0 ? (
                  <p className="mt-4 text-sm font-semibold text-navy-900">
                    {t("total")}: <span className="text-lg font-extrabold tabular-nums">{format(quantity * num(price))}</span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted">{t("empty")}</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
