"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Badge, CARD, Tile, initials, type Tone } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type GraduatesData = {
  university: string;
  counts: Record<string, number>;
  total: number;
  abroad: number;
  in_project: { people: number; studying: number; certified: number };
  leads: { id: string; full_name: string; specialty: string | null; graduation_year: number | null; abroad_interest: boolean; status: string; note: string | null; created: string }[];
  trades: { code: string; name: string }[];
};

const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "APPLIED", "DECLINED"] as const;
const TONE: Record<string, Tone> = { NEW: "amber", CONTACTED: "blue", INTERESTED: "green", APPLIED: "green", DECLINED: "red" };

export function GraduatesPanel({ initial }: { initial: GraduatesData }) {
  const t = useTranslations("grad");
  const mp = useTranslations("mp");
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [bulkNote, setBulkNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [converting, setConverting] = useState<GraduatesData["leads"][number] | null>(null);
  const [convertNote, setConvertNote] = useState("");

  async function reload(status = filter) {
    const fresh = await send<GraduatesData>(`/api/v1/graduates${status ? `?status=${status}` : ""}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setNote(null);
    const result = await send("/api/v1/graduates", "POST", {
      full_name: form.get("name"),
      phone: String(form.get("phone") ?? "").replace(/\s/g, ""),
      specialty: form.get("specialty") || null,
      graduation_year: form.get("year") ? Number(form.get("year")) : null,
      abroad_interest: form.get("abroad") === "on",
      note: form.get("note") || null,
    });
    setBusy(false);
    if (result.ok) {
      setNote({ ok: true, text: t("add.saved") });
      formElement.reset();
      await reload();
    } else {
      setNote({ ok: false, text: t("add.failed") });
    }
  }

  async function bulk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setBulkNote(null);
    const result = await send<{ created: number; failed: { line: string }[] }>("/api/v1/graduates/bulk", "POST", { lines: form.get("lines"), abroad_interest: true });
    setBusy(false);
    if (result.ok && result.data) {
      setBulkNote({ ok: result.data.failed.length === 0, text: `${t("bulk.result", { created: result.data.created, failed: result.data.failed.length })}${result.data.failed.length ? ` — ${result.data.failed.map((item) => item.line).join("; ")}` : ""}` });
      if (result.data.failed.length === 0) formElement.reset();
      await reload();
    } else {
      setBulkNote({ ok: false, text: t("add.failed") });
    }
  }

  async function setStatus(id: string, status: string) {
    await send(`/api/v1/graduates/${id}/status`, "POST", { status });
    await reload();
  }

  async function remove(id: string) {
    await send(`/api/v1/graduates/${id}`, "DELETE");
    await reload();
  }

  async function convert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!converting) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setConvertNote("");
    const result = await send(`/api/v1/graduates/${converting.id}/convert`, "POST", {
      trade_code: form.get("trade"),
      birth_date: form.get("birth"),
      track: form.get("track"),
      experience_years: Number(form.get("exp") || 0),
      has_language: form.get("lang") === "on",
      consent_confirmed: form.get("consent") === "on",
    });
    setBusy(false);
    if (result.ok) {
      setConverting(null);
      setNote({ ok: true, text: t("cv.ok") });
      await reload();
    } else {
      setConvertNote(t("cv.failed"));
    }
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <Tile label={t("kpi.total")} value={data.total} tone="blue" />
        <Tile label={t("kpi.abroad")} value={data.abroad} tone="amber" />
        {STATUSES.slice(1).map((status) => (
          <Tile key={status} label={t(`status.${status}`)} value={data.counts[status] ?? 0} tone={TONE[status]} />
        ))}
      </div>

      <section className={`${CARD} flex flex-wrap items-center gap-6`} aria-label={t("project.title", { university: data.university })}>
        <h2 className="text-lg font-extrabold text-navy-900">{t("project.title", { university: data.university })}</h2>
        <dl className="flex flex-wrap gap-6">
          {(["people", "studying", "certified"] as const).map((key) => (
            <div key={key}>
              <dd className="text-2xl font-extrabold text-navy-900 tabular-nums">{data.in_project[key]}</dd>
              <dt className="text-xs font-semibold text-muted">{t(`project.${key}`)}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={CARD} aria-labelledby="addg">
          <h2 id="addg" className="text-xl font-extrabold text-navy-900">{t("add.title")}</h2>
          <form onSubmit={(event) => void add(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              {t("f.name")}
              <input name="name" className={FIELD} required minLength={3} maxLength={160} />
            </label>
            <label className={label}>
              {t("f.phone")}
              <input name="phone" inputMode="tel" placeholder="+998901234567" className={FIELD} required />
            </label>
            <label className={label}>
              {t("f.specialty")}
              <input name="specialty" className={FIELD} maxLength={160} />
            </label>
            <label className={label}>
              {t("f.year")}
              <input name="year" type="number" min={1990} max={2100} className={FIELD} />
            </label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
              <input name="abroad" type="checkbox" defaultChecked className="size-4 accent-[var(--primary)]" />
              {t("f.abroad")}
            </label>
            <label className={`${label} sm:col-span-2`}>
              {t("f.note")}
              <input name="note" className={FIELD} maxLength={500} />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={busy}>{t("add.save")}</Button>
              {note ? (
                <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
                  {note.ok ? "✓ " : ""}
                  {note.text}
                </p>
              ) : null}
            </div>
          </form>
        </section>

        <section className={CARD} aria-labelledby="bulkg">
          <h2 id="bulkg" className="text-xl font-extrabold text-navy-900">{t("bulk.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("bulk.text")}</p>
          <form onSubmit={(event) => void bulk(event)} className="mt-4 flex flex-col gap-4">
            <textarea name="lines" rows={7} required className={`${FIELD} py-2 font-mono text-sm`} placeholder={"+998901234567, Karimov Aziz, Qurilish, 2025\n+998901234568, Aliyeva Dilnoza, Arxitektura, 2024"} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy}>{t("bulk.send")}</Button>
              {bulkNote ? (
                <p role="status" className={`text-sm font-semibold ${bulkNote.ok ? "text-success-600" : "text-danger-600"}`}>
                  {bulkNote.text}
                </p>
              ) : null}
            </div>
          </form>
        </section>
      </div>

      <section aria-labelledby="listg" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="listg" className="text-xl font-extrabold text-navy-900">{t("list.title")}</h2>
          <div className="flex flex-wrap gap-2">
            {(["", ...STATUSES] as const).map((status) => (
              <button
                key={status || "all"}
                type="button"
                aria-pressed={filter === status}
                onClick={() => {
                  setFilter(status);
                  void reload(status);
                }}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold ${filter === status ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
              >
                {status ? t(`status.${status}`) : t("list.all")}
              </button>
            ))}
          </div>
        </div>
        {data.leads.length === 0 ? (
          <EmptyState title={t("list.empty")} text="" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.leads.map((lead) => (
              <li key={lead.id} className={`${CARD} flex flex-col gap-3`}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                    {initials(lead.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-navy-900">{lead.full_name}</p>
                    <p className="text-sm text-muted">
                      {[lead.specialty, lead.graduation_year].filter(Boolean).join(" · ") || "—"} · {lead.created}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={TONE[lead.status] ?? "gray"}>{t(`status.${lead.status}` as "status.NEW")}</Badge>
                      {lead.abroad_interest ? <Badge tone="amber">{t("list.abroad")}</Badge> : null}
                    </p>
                    {lead.note ? <p className="mt-1 text-xs text-muted">{lead.note}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={lead.status} onChange={(event) => void setStatus(lead.id, event.target.value)} aria-label={t("list.title")} className={`${FIELD} !min-h-10 w-auto text-sm`}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{t(`status.${status}`)}</option>
                    ))}
                  </select>
                  {lead.status !== "APPLIED" ? (
                    <>
                      <button type="button" className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white hover:bg-primary-hover" onClick={() => setConverting(lead)}>
                        {t("convertButton")}
                      </button>
                      <button type="button" className="rounded-xl border border-line-strong px-3 py-2 text-sm font-bold text-navy-900 hover:border-danger-600 hover:text-danger-600" onClick={() => void remove(lead.id)}>
                        {t("delete")}
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {converting ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t("convertButton")}>
          <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={() => setConverting(null)} aria-label={t("close")} />
          <form onSubmit={(event) => void convert(event)} className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-card p-5 shadow-sh3">
            <h2 className="text-lg font-extrabold text-navy-900">{t("cv.title", { name: converting.full_name })}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={`${label} sm:col-span-2`}>
                {mp("f.trade")}
                <select name="trade" className={FIELD} required>
                  {data.trades.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                {mp("f.birth")}
                <input name="birth" type="date" required className={FIELD} />
              </label>
              <label className={label}>
                {mp("f.track")}
                <select name="track" className={FIELD} defaultValue="FOREIGN">
                  <option value="DOMESTIC">{mp("track.DOMESTIC")}</option>
                  <option value="FOREIGN">{mp("track.FOREIGN")}</option>
                </select>
              </label>
              <label className={label}>
                {mp("f.exp")}
                <input name="exp" type="number" min={0} max={40} step="0.5" defaultValue={0} className={FIELD} />
              </label>
              <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
                <input name="lang" type="checkbox" className="size-4 accent-[var(--primary)]" />
                {mp("f.lang")}
              </label>
              <label className="flex items-start gap-2 text-sm font-semibold text-navy-900 sm:col-span-2">
                <input name="consent" type="checkbox" required className="mt-0.5 size-4 accent-[var(--primary)]" />
                {mp("f.consent")}
              </label>
            </div>
            {convertNote ? <p className="mt-3 text-sm font-semibold text-danger-600">{convertNote}</p> : null}
            <div className="mt-5 flex gap-3">
              <Button type="submit" disabled={busy}>{t("cv.save")}</Button>
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-navy-900" onClick={() => setConverting(null)}>
                {t("close")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
