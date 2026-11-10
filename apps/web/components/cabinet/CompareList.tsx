"use client";

import { buttonClass } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { ActionButton } from "@/components/cabinet/ActionButton";
import { initials } from "@/components/cabinet/kit";

export type Candidate = { slug: string; name: string; level: string; availability: string; rating: number | null; hours: number; trade: string };

const MAX = 3;

/** Shortlist cards with a pick box; 2–3 picked workers open a side-by-side table. */
export function CompareList({ items }: { items: Candidate[] }) {
  const t = useTranslations("shortlist");
  const w = useTranslations("workerProfile");
  const states = useTranslations("states");
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function toggle(slug: string) {
    setPicked((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : current.length >= MAX ? current : [...current, slug]));
  }

  const chosen = items.filter((item) => picked.includes(item.slug));
  const bestHours = Math.max(0, ...chosen.map((item) => item.hours));
  const bestRating = Math.max(0, ...chosen.map((item) => item.rating ?? 0));
  const rows: { label: string; cell: (item: Candidate) => { text: string; best?: boolean } }[] = [
    { label: t("rowTrade"), cell: (item) => ({ text: item.trade }) },
    { label: t("rowLevel"), cell: (item) => ({ text: w(`levels.${item.level}` as "levels.MASTER") }) },
    { label: t("rowStatus"), cell: (item) => ({ text: w(`availabilities.${item.availability}` as "availabilities.FREE") }) },
    { label: t("rowHours"), cell: (item) => ({ text: String(item.hours), best: chosen.length > 1 && item.hours === bestHours && bestHours > 0 }) },
    {
      label: t("rowRating"),
      cell: (item) => ({ text: item.rating === null ? t("noRating") : `★ ${item.rating.toFixed(1)}`, best: chosen.length > 1 && item.rating !== null && item.rating === bestRating }),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {items.length > 1 ? <p className="text-sm text-muted">{t("compareHint")}</p> : null}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const on = picked.includes(item.slug);
          return (
            <li key={item.slug} className={`rounded-2xl border bg-card p-5 shadow-sh1 transition ${on ? "border-primary ring-2 ring-primary/30" : "border-line"}`}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                  {initials(item.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-navy-900">{item.name}</p>
                  <p className="text-sm font-semibold text-primary">{item.trade}</p>
                </div>
                {items.length > 1 ? (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-muted">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!on && picked.length >= MAX}
                      onChange={() => toggle(item.slug)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {t("pick")}
                  </label>
                ) : null}
              </div>
              <p className="mt-3 text-sm text-muted">
                {w(`levels.${item.level}` as "levels.MASTER")} · {w(`availabilities.${item.availability}` as "availabilities.FREE")} · {t("hours", { n: item.hours })}
                {item.rating !== null ? ` · ★ ${item.rating.toFixed(1)}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/ustalar/${item.slug}`} className={buttonClass({ variant: "secondary" })}>
                  {t("open")}
                </Link>
                <ActionButton url={`/api/v1/employers/shortlist/${item.slug}`} method="DELETE" label={t("remove")} failed={states("errorTitle")} variant="ghost" />
              </div>
            </li>
          );
        })}
      </ul>

      {picked.length > 0 ? (
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 shadow-sh2 lg:bottom-4">
          <p className="text-sm font-semibold text-navy-900">{t("pickedN", { n: picked.length })}</p>
          <div className="flex gap-2">
            <button type="button" className={buttonClass({ variant: "ghost" })} onClick={() => setPicked([])}>
              {t("clear")}
            </button>
            <button type="button" disabled={picked.length < 2} className={buttonClass()} onClick={() => setOpen(true)}>
              {t("compare")}
            </button>
          </div>
        </div>
      ) : null}

      {open && chosen.length > 1 ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("compare")}>
          <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={() => setOpen(false)} aria-label={t("close")} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-line bg-card p-5 shadow-sh3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-navy-900">{t("compare")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg bg-surface-100 text-navy-900" aria-label={t("close")}>
                ✕
              </button>
            </div>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-28 p-2 text-left" />
                  {chosen.map((item) => (
                    <th key={item.slug} className="p-2 text-left align-bottom">
                      <Link href={`/ustalar/${item.slug}`} className="font-extrabold text-navy-900 hover:text-primary">
                        {item.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-line">
                    <th scope="row" className="p-2 text-left font-semibold text-muted">
                      {row.label}
                    </th>
                    {chosen.map((item) => {
                      const cell = row.cell(item);
                      return (
                        <td key={item.slug} className={`p-2 font-bold tabular-nums ${cell.best ? "text-success-600" : "text-navy-900"}`}>
                          {cell.text}
                          {cell.best ? <span className="ml-1 text-xs" title={t("best")}>▲</span> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">▲ {t("best")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
