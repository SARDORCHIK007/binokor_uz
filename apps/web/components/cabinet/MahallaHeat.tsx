"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export type MahallaRow = { mahalla: string; people: number; studying: number; certified: number; workers: number };

const METRICS = ["people", "studying", "certified", "workers"] as const;
type Metric = (typeof METRICS)[number];

/** Heat tiles: one tile per mahalla, shade by the chosen figure. This is a density view, not a geographic map. */
export function MahallaHeat({ rows }: { rows: MahallaRow[] }) {
  const t = useTranslations("mahallas");
  const [metric, setMetric] = useState<Metric>("people");
  const max = Math.max(1, ...rows.map((row) => row[metric]));
  const total = rows.reduce((sum, row) => sum + row[metric], 0);

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sh1" aria-labelledby="heat-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="heat-title" className="text-lg font-extrabold text-navy-900">
            {t("heatTitle")}
          </h2>
          <p className="text-sm text-muted">{t("heatText", { total })}</p>
        </div>
        <div role="group" aria-label={t("heatTitle")} className="flex flex-wrap gap-2 print:hidden">
          {METRICS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold ${
                metric === key ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => {
          const share = row[metric] / max;
          return (
            <li
              key={row.mahalla}
              className="relative overflow-hidden rounded-xl border border-line p-3"
              title={`${row.mahalla}: ${row[metric]}`}
            >
              <span className="absolute inset-0 bg-primary" style={{ opacity: row[metric] === 0 ? 0 : 0.1 + share * 0.5 }} aria-hidden="true" />
              <span className="relative block truncate text-sm font-bold text-navy-900">{row.mahalla}</span>
              <span className="relative mt-1 block text-2xl font-extrabold text-navy-900 tabular-nums">{row[metric]}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted">{t("heatNote")}</p>
    </section>
  );
}
