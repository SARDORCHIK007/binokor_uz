"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Meter } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Plan = { year: number; elapsed_pct: number; items: { metric: string; target: number | null; actual: number; pct: number | null; expected: number | null; on_track: boolean | null }[] };
type Task = { id: string; team: string; title: string; detail: string | null; due: string | null; status: string; created: string; done_at: string | null; done_note: string | null; done_by: string | null; overdue: boolean };

const TEAMS = ["employment", "agency", "mahalla", "education"] as const;

export function DistrictPlan() {
  const t = useTranslations("dp");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ team: "employment", title: "", detail: "", due: "" });
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [p, list] = await Promise.all([send<Plan>("/api/v1/district/plan", "GET"), send<Task[]>("/api/v1/district/tasks", "GET")]);
    if (p.ok && p.data) setPlan(p.data);
    else setFailed(true);
    if (list.ok && list.data) setTasks(list.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!plan) return null;

  const report = (ok: boolean) => setNote({ ok, text: ok ? t("saved") : t("failed") });

  async function savePlan() {
    if (!plan) return;
    const targets = Object.fromEntries(Object.entries(draft).filter(([, value]) => value.trim() !== "").map(([key, value]) => [key, Number(value)]));
    const result = await send("/api/v1/district/plan", "PUT", { year: plan.year, targets });
    report(result.ok);
    if (result.ok) {
      setEditing(false);
      await load();
    }
  }

  async function sendTask() {
    const result = await send("/api/v1/district/tasks", "POST", { team: form.team, title: form.title, detail: form.detail, due: form.due || null });
    report(result.ok);
    if (result.ok) {
      setForm({ ...form, title: "", detail: "", due: "" });
      await load();
    }
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  return (
    <div className="flex flex-col gap-6">
      <Link href="/kabinet/hokimlik" className={`${buttonClass({ variant: "secondary" })} w-fit`}>{t("back")}</Link>
      {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}

      <section className={CARD} aria-labelledby="dp-plan">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="dp-plan" className="text-lg font-extrabold text-navy-900">{t("plan", { year: plan.year })}</h2>
            <p className="text-sm text-muted">{t("elapsed", { n: plan.elapsed_pct })}</p>
          </div>
          {editing ? null : <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => { setEditing(true); setDraft(Object.fromEntries(plan.items.map((i) => [i.metric, i.target === null ? "" : String(i.target)]))); }}>{t("edit")}</button>}
        </div>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {plan.items.map((item) => (
            <li key={item.metric} className="rounded-xl border border-line bg-surface-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-navy-900">{t(`m.${item.metric}` as "m.applicants")}</p>
                {item.on_track === null ? null : <Badge tone={item.on_track ? "green" : "amber"}>{item.on_track ? t("onTrack") : t("behind")}</Badge>}
              </div>
              {editing ? (
                <label className={`${label} mt-3`}>
                  {t("target")}
                  <input type="number" min="0" className={FIELD} value={draft[item.metric] ?? ""} onChange={(event) => setDraft({ ...draft, [item.metric]: event.target.value })} />
                </label>
              ) : item.target === null ? (
                <p className="mt-2 text-sm text-muted">{t("noTarget")} · {t("actual")}: <span className="font-bold text-navy-900">{item.actual}</span></p>
              ) : (
                <div className="mt-3 flex flex-col gap-1.5">
                  <p className="text-sm text-navy-900"><span className="text-2xl font-extrabold tabular-nums">{item.actual}</span> / {item.target} <span className="text-muted">({item.pct}%)</span></p>
                  <Meter value={Math.min(item.pct ?? 0, 100)} tone={item.on_track ? "green" : "amber"} label={`${t(`m.${item.metric}` as "m.applicants")} ${item.pct}%`} />
                  <p className="text-xs text-muted">{t("expected", { n: item.expected ?? 0 })}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
        {editing ? (
          <div className="mt-4 flex gap-2">
            <button type="button" className={buttonClass()} onClick={() => void savePlan()}>{t("save")}</button>
            <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setEditing(false)}>×</button>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className={`${CARD} flex flex-col gap-3 self-start`} aria-labelledby="dp-new">
          <h2 id="dp-new" className="text-lg font-extrabold text-navy-900">{t("newTask")}</h2>
          <label className={label}>
            {t("teamLabel")}
            <select className={FIELD} value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })}>
              {TEAMS.map((team) => <option key={team} value={team}>{t(`team.${team}`)}</option>)}
            </select>
          </label>
          <label className={label}>
            {t("taskTitle")}
            <input className={FIELD} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label className={label}>
            {t("detail")}
            <textarea className={`${FIELD} min-h-20 py-2`} value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} />
          </label>
          <label className={label}>
            {t("due")}
            <input type="date" className={FIELD} value={form.due} onChange={(event) => setForm({ ...form, due: event.target.value })} />
          </label>
          <button type="button" className={`${buttonClass()} w-fit`} disabled={form.title.trim().length < 5} onClick={() => void sendTask()}>{t("send")}</button>
        </section>

        <section aria-labelledby="dp-tasks" className="flex flex-col gap-3">
          <h2 id="dp-tasks" className="text-lg font-extrabold text-navy-900">{t("tasks")}</h2>
          {tasks.length === 0 ? (
            <EmptyState title={t("noTasks")} text="" />
          ) : (
            <ul className="flex flex-col gap-3">
              {tasks.map((task) => (
                <li key={task.id} className={CARD}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-navy-900">{task.title}</p>
                      <p className="text-xs text-muted">{t(`team.${task.team}` as "team.agency")} · {task.created}{task.due ? ` → ${task.due}` : ""}</p>
                    </div>
                    <p className="flex flex-wrap gap-1.5">
                      {task.overdue ? <Badge tone="red">{t("overdue")}</Badge> : null}
                      <Badge tone={task.status === "DONE" ? "green" : task.status === "CANCELLED" ? "gray" : "amber"}>{t(`status.${task.status}` as "status.OPEN")}</Badge>
                    </p>
                  </div>
                  {task.detail ? <p className="mt-2 text-sm text-muted">{task.detail}</p> : null}
                  {task.status === "DONE" ? <p className="mt-2 text-sm text-navy-900">{t("doneBy", { name: task.done_by ?? "—", day: task.done_at ?? "" })}{task.done_note ? ` · ${task.done_note}` : ""}</p> : null}
                  {task.status === "OPEN" ? (
                    <button type="button" className={`${buttonClass({ variant: "secondary" })} mt-3`} onClick={() => void send(`/api/v1/district/tasks/${task.id}/cancel`, "POST").then(() => load())}>{t("cancel")}</button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
