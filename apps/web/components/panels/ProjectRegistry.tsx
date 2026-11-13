"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge, CARD, initials, type Tone } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type RegistryData = {
  counts: Record<string, number>;
  total: number;
  people: { id: string; user_id: string | null; name: string; trade: string; trade_code: string | null; mahalla: string; group: string | null; source: string | null; applied: string | null; certified: boolean; hours: number; slug: string | null; stage: string }[];
  trades: { code: string; name: string }[];
};
type Options = { employers: { id: string; name: string }[] };

const STAGES = ["APPLIED", "ACCEPTED", "STUDYING", "CERTIFIED", "FREE", "WORKING", "CLOSED"] as const;
const TONE: Record<string, Tone> = { APPLIED: "amber", ACCEPTED: "blue", STUDYING: "blue", CERTIFIED: "green", FREE: "green", WORKING: "gray", CLOSED: "red" };

export function ProjectRegistry({ initial, options }: { initial: RegistryData; options: Options }) {
  const t = useTranslations("reg");
  const mp = useTranslations("mp");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [stage, setStage] = useState("");
  const [trade, setTrade] = useState("");
  const [query, setQuery] = useState("");
  const [placing, setPlacing] = useState<RegistryData["people"][number] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ lang: locale });
    if (stage) params.set("stage", stage);
    if (trade) params.set("trade", trade);
    if (query.trim()) params.set("q", query.trim());
    const result = await send<RegistryData>(`/api/v1/employment/people?${params.toString()}`, "GET");
    if (result.ok && result.data) setData(result.data);
  }, [locale, stage, trade, query]);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  async function place(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!placing?.user_id) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result = await send("/api/v1/employment/placements", "POST", {
      worker_user_id: placing.user_id,
      employer_id: form.get("employer"),
      start_date: form.get("start"),
      monthly_salary: form.get("salary") ? Number(form.get("salary")) : null,
    });
    setBusy(false);
    setNote(result.ok ? { ok: true, text: t("placeOk") } : { ok: false, text: result.status === 409 ? t("placeBusy") : t("placeFail") });
    if (result.ok) {
      setPlacing(null);
      await load();
    }
  }

  const max = Math.max(1, ...STAGES.map((key) => data.counts[key] ?? 0));

  return (
    <div className="flex flex-col gap-5">
      <section className={CARD} aria-label={t("title")}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {STAGES.map((key) => (
            <li key={key}>
              <button
                type="button"
                aria-pressed={stage === key}
                onClick={() => setStage(stage === key ? "" : key)}
                className={`w-full rounded-xl border p-3 text-left transition ${stage === key ? "border-primary bg-blue-50" : "border-line bg-surface-100 hover:border-primary"}`}
              >
                <span className="block text-2xl font-extrabold text-navy-900 tabular-nums">{data.counts[key] ?? 0}</span>
                <span className="block text-xs font-semibold text-muted">{t(`stage.${key}`)}</span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-card">
                  <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${(100 * (data.counts[key] ?? 0)) / max}%` }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} aria-label={t("search")} className={`${FIELD} max-w-xs`} />
        <select value={trade} onChange={(event) => setTrade(event.target.value)} aria-label={t("col.trade")} className={`${FIELD} max-w-56`}>
          <option value="">{t("allTrades")}</option>
          {data.trades.map((item) => (
            <option key={item.code} value={item.code}>{item.name}</option>
          ))}
        </select>
        {stage ? (
          <button type="button" className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-bold text-primary" onClick={() => setStage("")}>
            {t(`stage.${stage}` as "stage.APPLIED")} ✕
          </button>
        ) : null}
        <span className="text-sm font-semibold text-muted">{t("total", { n: data.total })}</span>
        <a href="/api/v1/employment/people.csv" className="ml-auto rounded-xl border border-line-strong bg-card px-4 py-2 text-sm font-bold text-navy-900 hover:border-primary hover:text-primary">
          ⤓ {t("export")}
        </a>
      </div>

      {note ? (
        <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
          {note.ok ? "✓ " : ""}
          {note.text}
        </p>
      ) : null}

      {data.people.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <div className={`${CARD} overflow-x-auto p-0`}>
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-semibold">{t("col.name")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.stage")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.trade")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.group")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.mahalla")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("col.hours")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.people.map((person) => (
                <tr key={person.id}>
                  <th scope="row" className="px-4 py-3 text-left">
                    <span className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-primary" aria-hidden="true">
                        {initials(person.name)}
                      </span>
                      <span className="min-w-0">
                        <Link href={`/kabinet/shaxs/${person.id}`} className="block truncate font-bold text-navy-900 hover:text-primary">{person.name}</Link>
                        {person.source ? <span className="block text-xs font-normal text-muted">{mp(`source.${person.source}` as "source.MAHALLA")}</span> : null}
                      </span>
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[person.stage] ?? "gray"}>{t(`stage.${person.stage}` as "stage.APPLIED")}</Badge>
                  </td>
                  <td className="px-4 py-3">{person.trade || "—"}</td>
                  <td className="px-4 py-3">{person.group ?? "—"}</td>
                  <td className="px-4 py-3">{person.mahalla || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{person.hours}</td>
                  <td className="px-4 py-3 text-right">
                    {person.stage === "FREE" && person.user_id ? (
                      <button type="button" className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover" onClick={() => setPlacing(person)}>
                        {t("place")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {placing ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("place")}>
          <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={() => setPlacing(null)} aria-label={t("close")} />
          <form onSubmit={(event) => void place(event)} className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-sh3">
            <h2 className="text-lg font-extrabold text-navy-900">{t("placeTitle", { name: placing.name })}</h2>
            {options.employers.length === 0 ? <p className="mt-3 text-sm text-warning-600">{t("noEmployers")}</p> : null}
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
                {t("employer")}
                <select name="employer" className={FIELD} required>
                  {options.employers.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
                {t("start")}
                <input name="start" type="date" required className={FIELD} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
                {t("salary")}
                <input name="salary" type="number" min={0} className={FIELD} />
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <Button type="submit" disabled={busy || options.employers.length === 0}>{t("save")}</Button>
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-navy-900" onClick={() => setPlacing(null)}>
                {t("close")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
