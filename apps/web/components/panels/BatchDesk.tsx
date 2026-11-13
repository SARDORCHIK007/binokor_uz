"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Badge, CARD, Tile, type Tone } from "@/components/cabinet/kit";
import { send } from "@/lib/clientApi";

export type BatchData = {
  batch: { id: string; period: string; status: string; note: string | null; program: string; monthly_amount: number; min_attendance: number; created: string; approved: string | null; paid: string | null; created_by_me: boolean; can_approve: boolean };
  totals: { payees: number; held: number; amount: number };
  lines: { id: string; person_id: string; name: string; mahalla: string; group: string | null; amount: number; lessons: number; present: number; attendance: number | null; status: string; reason: string | null; note: string | null }[];
  history: { action: string; detail: Record<string, unknown>; at: string; by: string | null }[];
};

const TONE: Record<string, Tone> = { DRAFT: "amber", APPROVED: "blue", PAID: "green", CANCELLED: "gray" };

export function BatchDesk({ initial }: { initial: BatchData }) {
  const t = useTranslations("pay");
  const desk = useTranslations("pay.desk");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<"" | "ELIGIBLE" | "HELD" | "PAID">("");
  const [dialog, setDialog] = useState<{ line: BatchData["lines"][number]; kind: "hold" | "release" } | null>(null);
  const [busy, setBusy] = useState(false);
  const { batch } = data;

  async function reload() {
    const fresh = await send<BatchData>(`/api/v1/payments/batches/${batch.id}?lang=${locale}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function act(path: string) {
    setBusy(true);
    setNote(null);
    const result = await send<{ code?: string }>(`/api/v1/payments/batches/${batch.id}/${path}`, "POST");
    setBusy(false);
    setNote(result.ok ? { ok: true, text: desk("done") } : { ok: false, text: result.data?.code === "SAME_USER" ? desk("sameUser") : desk("failed") });
    await reload();
  }

  async function submitLine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result = await send(`/api/v1/payments/lines/${dialog.line.id}/${dialog.kind}`, "POST", { note: form.get("note") });
    setBusy(false);
    setNote(result.ok ? { ok: true, text: desk("done") } : { ok: false, text: desk("failed") });
    if (result.ok) setDialog(null);
    await reload();
  }

  const lines = data.lines.filter((line) => !filter || line.status === filter);
  const open = batch.status === "DRAFT" || batch.status === "APPROVED";

  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} flex flex-wrap items-center justify-between gap-4`}>
        <div className="min-w-0">
          <p className="text-3xl font-extrabold text-navy-900 tabular-nums">{batch.period}</p>
          <p className="text-sm text-muted">{batch.program}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={TONE[batch.status] ?? "gray"}>{t(`status.${batch.status}` as "status.DRAFT")}</Badge>
            <span className="text-xs text-muted">{desk("rule", { amount: batch.monthly_amount.toLocaleString("ru-RU"), min: batch.min_attendance })}</span>
          </p>
          {batch.note ? <p className="mt-1 text-xs text-muted">{batch.note}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {batch.status === "DRAFT" ? (
            <>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void act("recalculate")}>{desk("recalc")}</Button>
              <Button type="button" disabled={busy || !batch.can_approve || data.totals.payees === 0} onClick={() => void act("approve")}>{desk("approve")}</Button>
            </>
          ) : null}
          {batch.status === "APPROVED" ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(desk("confirmPaid"))) void act("paid");
              }}
            >
              {desk("markPaid")}
            </Button>
          ) : null}
          {open ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void act("cancel")}>{desk("cancel")}</Button>
          ) : null}
          <a href={`/api/v1/payments/batches/${batch.id}/export.csv`} className="inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-card px-4 text-sm font-bold text-navy-900 hover:border-primary hover:text-primary">
            ⤓ {desk("export")}
          </a>
        </div>
      </section>
      {batch.status === "DRAFT" && !batch.can_approve ? <p className="text-sm font-semibold text-warning-600">{desk("sameUser")}</p> : null}
      {note ? (
        <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
          {note.ok ? "✓ " : ""}
          {note.text}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label={desk("payees")} value={data.totals.payees} tone="green" />
        <Tile label={desk("heldCount")} value={data.totals.held} tone={data.totals.held > 0 ? "red" : "blue"} />
        <Tile label={desk("total")} value={t("sum", { n: data.totals.amount.toLocaleString("ru-RU") })} tone="blue" />
      </div>

      <section aria-labelledby="lines" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(["", "ELIGIBLE", "HELD", "PAID"] as const).map((key) => (
            <button
              key={key || "all"}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-bold ${filter === key ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
            >
              {key ? t(`line.${key}`) : "∗"}
            </button>
          ))}
        </div>
        {lines.length === 0 ? (
          <EmptyState title={desk("noLines")} text="" />
        ) : (
          <div className={`${CARD} overflow-x-auto p-0`}>
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="px-4 py-3 font-semibold">{desk("col.name")}</th>
                  <th className="px-4 py-3 font-semibold">{desk("col.group")}</th>
                  <th className="px-4 py-3 font-semibold">{desk("col.attendance")}</th>
                  <th className="px-4 py-3 text-right font-semibold">{desk("col.amount")}</th>
                  <th className="px-4 py-3 font-semibold">{desk("col.status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <th scope="row" className="px-4 py-3 text-left">
                      <Link href={`/kabinet/shaxs/${line.person_id}`} className="block font-bold text-navy-900 hover:text-primary">{line.name}</Link>
                      <span className="block text-xs font-normal text-muted">{line.mahalla || "—"}</span>
                    </th>
                    <td className="px-4 py-3">{line.group ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {line.attendance === null ? "—" : `${line.attendance}%`}
                      <span className="block text-xs text-muted">{desk("lessons", { p: line.present, n: line.lessons })}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-navy-900">{line.amount.toLocaleString("ru-RU")}</td>
                    <td className="px-4 py-3">
                      <Badge tone={line.status === "HELD" ? "red" : line.status === "PAID" ? "green" : "blue"}>{t(`line.${line.status}` as "line.HELD")}</Badge>
                      {line.reason ? <span className="mt-1 block text-xs text-muted">{t(`reason.${line.reason}` as "reason.MANUAL")}{line.note ? `: ${line.note}` : ""}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {open && line.status === "ELIGIBLE" ? (
                        <button type="button" className="text-xs font-bold text-danger-600 hover:underline" onClick={() => setDialog({ line, kind: "hold" })}>
                          {desk("hold")}
                        </button>
                      ) : null}
                      {open && line.status === "HELD" ? (
                        <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setDialog({ line, kind: "release" })}>
                          {desk("release")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={CARD} aria-labelledby="hist">
        <h2 id="hist" className="text-lg font-extrabold text-navy-900">{desk("history")}</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {data.history.map((item, index) => (
            <li key={`${item.at}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-semibold text-navy-900">{t(`log.${item.action}` as "log.CREATED")}</span>
              <span className="text-xs text-muted">{item.by ?? "—"} · {item.at}</span>
            </li>
          ))}
        </ul>
      </section>

      {dialog ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={dialog.line.name}>
          <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={() => setDialog(null)} aria-label="close" />
          <form onSubmit={(event) => void submitLine(event)} className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-sh3">
            <h2 className="text-lg font-extrabold text-navy-900">{dialog.line.name}</h2>
            <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-muted">
              {desk("reasonPrompt")}
              <textarea name="note" rows={3} required minLength={3} maxLength={300} className="min-h-11 w-full rounded-xl border border-line-strong bg-card px-3 py-2 text-base text-navy-900 focus:border-primary focus:outline-none" />
            </label>
            <div className="mt-4 flex gap-3">
              <Button type="submit" disabled={busy}>{dialog.kind === "hold" ? desk("hold") : desk("release")}</Button>
              <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-navy-900" onClick={() => setDialog(null)}>
                {desk("cancel")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
