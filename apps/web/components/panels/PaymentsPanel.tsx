"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Badge, CARD, Tile, type Tone } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type PaymentsOverview = {
  programs: { id: string; name: string; monthly_amount: number; min_attendance: number; active: boolean }[];
  batches: { id: string; period: string; status: string; program: string; created: string; payees: number; held: number; total: number }[];
  stats: { paid_year: number; people_paid: number; pending: number; held_open: number };
  home_district: string;
};

const TONE: Record<string, Tone> = { DRAFT: "amber", APPROVED: "blue", PAID: "green", CANCELLED: "gray" };

export function PaymentsPanel({ initial }: { initial: PaymentsOverview }) {
  const t = useTranslations("pay");
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const money = (value: number) => t("sum", { n: value.toLocaleString("ru-RU") });
  const activePrograms = data.programs.filter((item) => item.active);
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  async function reload() {
    const fresh = await send<PaymentsOverview>("/api/v1/payments/overview", "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function createProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setNote(null);
    const result = await send("/api/v1/payments/programs", "POST", {
      name: form.get("name"),
      monthly_amount: Number(form.get("amount")),
      min_attendance: Number(form.get("min") || 80),
    });
    setBusy(false);
    setNote(result.ok ? { ok: true, text: t("programCreated") } : { ok: false, text: t("createFailed") });
    if (result.ok) {
      formElement.reset();
      await reload();
    }
  }

  async function toggle(id: string, active: boolean) {
    await send(`/api/v1/payments/programs/${id}`, "POST", { active });
    await reload();
  }

  async function createBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNote(null);
    const result = await send("/api/v1/payments/batches", "POST", { program_id: form.get("program"), period: form.get("period"), note: form.get("note") || null });
    setBusy(false);
    setNote(result.ok ? { ok: true, text: t("created") } : { ok: false, text: t("createFailed") });
    if (result.ok) await reload();
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("kpi.paidYear")} value={money(data.stats.paid_year)} tone="green" />
        <Tile label={t("kpi.peoplePaid")} value={data.stats.people_paid} tone="green" />
        <Tile label={t("kpi.pending")} value={money(data.stats.pending)} tone="amber" />
        <Tile label={t("kpi.heldOpen")} value={data.stats.held_open} tone={data.stats.held_open > 0 ? "red" : "blue"} />
      </div>

      {note ? (
        <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
          {note.ok ? "✓ " : ""}
          {note.text}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={CARD} aria-labelledby="programs">
          <h2 id="programs" className="text-xl font-extrabold text-navy-900">{t("programs")}</h2>
          <p className="mt-1 text-sm text-muted">{t("programsText")}</p>
          {data.programs.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-warning-600">{t("noPrograms")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
              {data.programs.map((program) => (
                <li key={program.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-bold text-navy-900">{program.name}</span>
                    <span className="text-xs text-muted">{t("programRule", { amount: program.monthly_amount.toLocaleString("ru-RU"), min: program.min_attendance })}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={program.active ? "green" : "gray"}>{program.active ? t("active") : t("inactive")}</Badge>
                    <button type="button" className="font-bold text-primary hover:underline" onClick={() => void toggle(program.id, !program.active)}>
                      {program.active ? t("deactivate") : t("activate")}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={(event) => void createProgram(event)} className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className={`${label} sm:col-span-3`}>
              {t("f.name")}
              <input name="name" className={FIELD} required minLength={3} maxLength={120} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              {t("f.amount")}
              <input name="amount" type="number" min={1} step="1000" className={FIELD} required />
            </label>
            <label className={label}>
              {t("f.minAttendance")}
              <input name="min" type="number" min={0} max={100} defaultValue={80} className={FIELD} />
            </label>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={busy}>{t("createProgram")}</Button>
            </div>
          </form>
        </section>

        <section className={CARD} aria-labelledby="newbatch">
          <h2 id="newbatch" className="text-xl font-extrabold text-navy-900">{t("newBatch")}</h2>
          <form onSubmit={(event) => void createBatch(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={label}>
              {t("f.program")}
              <select name="program" className={FIELD} required disabled={activePrograms.length === 0}>
                {activePrograms.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              {t("f.period")}
              <input name="period" type="month" defaultValue={defaultPeriod} className={FIELD} required />
            </label>
            <label className={`${label} sm:col-span-2`}>
              {t("f.note")}
              <input name="note" className={FIELD} maxLength={500} />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy || activePrograms.length === 0}>{t("calc")}</Button>
            </div>
          </form>
        </section>
      </div>

      <section aria-labelledby="batches" className="flex flex-col gap-3">
        <h2 id="batches" className="text-xl font-extrabold text-navy-900">{t("batches")}</h2>
        {data.batches.length === 0 ? (
          <EmptyState title={t("noBatches")} text="" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.batches.map((batch) => (
              <li key={batch.id}>
                <Link href={`/kabinet/bandlik/tolovlar/${batch.id}`} className={`${CARD} flex items-center justify-between gap-4 transition hover:border-primary`}>
                  <span className="min-w-0">
                    <span className="block text-lg font-extrabold text-navy-900 tabular-nums">{batch.period}</span>
                    <span className="block truncate text-sm text-muted">{batch.program}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={TONE[batch.status] ?? "gray"}>{t(`status.${batch.status}` as "status.DRAFT")}</Badge>
                      <Badge tone="blue">{t("payees", { n: batch.payees })}</Badge>
                      {batch.held > 0 ? <Badge tone="red">{t("held", { n: batch.held })}</Badge> : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xl font-extrabold text-navy-900 tabular-nums">{batch.total.toLocaleString("ru-RU")}</span>
                    <span className="text-xs text-muted">{t("open")} →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
