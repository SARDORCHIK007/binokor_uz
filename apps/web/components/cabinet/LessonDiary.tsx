"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Meter } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type MentorData = {
  groups: { id: string; code: string; students: number; days: string[] }[];
  logs: { id: string; group_id: string; date: string; topic: string; homework: string | null; note: string | null; done: number }[];
};
type StudentData = {
  logs: { id: string; group: string; date: string; topic: string; homework: string | null; note: string | null; mentor: string | null; done: boolean }[];
  homework_total: number;
  homework_done: number;
};

const today = () => new Date().toISOString().slice(0, 10);

export function MentorDiary() {
  const t = useTranslations("dy");
  const [data, setData] = useState<MentorData | null>(null);
  const [failed, setFailed] = useState(false);
  const [group, setGroup] = useState("");
  const [date, setDate] = useState(today());
  const [topic, setTopic] = useState("");
  const [homework, setHomework] = useState("");
  const [note, setNote] = useState("");
  const [announce, setAnnounce] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const result = await send<MentorData>("/api/v1/classroom/mentor", "GET");
    if (result.ok && result.data) {
      setData(result.data);
      setGroup((current) => current || result.data?.groups[0]?.id || "");
    } else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;
  if (data.groups.length === 0) return <EmptyState title={t("noGroups")} text="" />;

  async function save() {
    const result = await send("/api/v1/classroom/logs", "POST", { group_id: group, lesson_date: date, topic, homework, note, announce });
    setMsg(result.ok ? { ok: true, text: t("saved") } : { ok: false, text: t("failed") });
    if (result.ok) {
      setTopic("");
      setHomework("");
      setNote("");
      await load();
    }
  }

  function edit(log: MentorData["logs"][number]) {
    setGroup(log.group_id);
    setDate(log.date);
    setTopic(log.topic);
    setHomework(log.homework ?? "");
    setNote(log.note ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    await send(`/api/v1/classroom/logs/${id}`, "DELETE");
    await load();
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  const codeOf = (id: string) => data.groups.find((g) => g.id === id)?.code ?? "";
  const sizeOf = (id: string) => data.groups.find((g) => g.id === id)?.students ?? 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <section className={`${CARD} flex flex-col gap-4 self-start`} aria-labelledby="dy-new">
        <h2 id="dy-new" className="text-lg font-extrabold text-navy-900">{t("new")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>
            {t("group")}
            <select className={FIELD} value={group} onChange={(event) => setGroup(event.target.value)}>
              {data.groups.map((g) => (
                <option key={g.id} value={g.id}>{g.code} · {t("students", { n: g.students })}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("date")}
            <input type="date" className={FIELD} value={date} max={today()} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        <label className={label}>
          {t("topic")}
          <input className={FIELD} value={topic} onChange={(event) => setTopic(event.target.value)} />
        </label>
        <label className={label}>
          {t("homework")}
          <textarea className={`${FIELD} min-h-20 py-2`} value={homework} onChange={(event) => setHomework(event.target.value)} />
        </label>
        <label className={label}>
          {t("note")}
          <textarea className={`${FIELD} min-h-16 py-2`} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={announce} onChange={(event) => setAnnounce(event.target.checked)} />
          {t("announce")}
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={buttonClass()} disabled={topic.trim().length < 3} onClick={() => void save()}>{t("save")}</button>
          {msg ? <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-success-600" : "text-danger-600"}`}>{msg.text}</p> : null}
        </div>
      </section>

      <section aria-labelledby="dy-recent" className="flex flex-col gap-3">
        <h2 id="dy-recent" className="text-lg font-extrabold text-navy-900">{t("recent")}</h2>
        {data.logs.length === 0 ? (
          <EmptyState title={t("empty")} text="" />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.logs.map((log) => (
              <li key={log.id} className={CARD}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-navy-900">{log.topic}</p>
                    <p className="text-xs text-muted">{codeOf(log.group_id)} · {log.date}</p>
                  </div>
                  {log.homework ? <Badge tone={log.done >= sizeOf(log.group_id) && log.done > 0 ? "green" : "amber"}>{t("doneOf", { done: log.done, n: sizeOf(log.group_id) })}</Badge> : <Badge tone="gray">{t("noHomework")}</Badge>}
                </div>
                {log.homework ? <p className="mt-2 text-sm text-navy-900">{log.homework}</p> : null}
                {log.note ? <p className="mt-1 text-sm text-muted">{log.note}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => edit(log)}>{t("edit")}</button>
                  <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void remove(log.id)}>{t("delete")}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function StudentDiary() {
  const t = useTranslations("dy");
  const [data, setData] = useState<StudentData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const result = await send<StudentData>("/api/v1/classroom/student", "GET");
    if (result.ok && result.data) setData(result.data);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  async function toggle(id: string, done: boolean) {
    await send(`/api/v1/classroom/logs/${id}/done`, "POST", { done });
    await load();
  }

  return (
    <div className="flex flex-col gap-5">
      {data.homework_total > 0 ? (
        <div className={`${CARD} flex flex-col gap-2`}>
          <p className="text-sm font-bold text-navy-900">{t("homeworkProgress", { done: data.homework_done, total: data.homework_total })}</p>
          <Meter value={Math.round((100 * data.homework_done) / data.homework_total)} tone="green" label={t("homework")} />
        </div>
      ) : null}
      {data.logs.length === 0 ? (
        <EmptyState title={t("studentEmpty")} text="" />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.logs.map((log) => (
            <li key={log.id} className={CARD}>
              <p className="font-bold text-navy-900">{log.topic}</p>
              <p className="text-xs text-muted">{log.group} · {log.date}{log.mentor ? ` · ${t("by", { name: log.mentor })}` : ""}</p>
              {log.homework ? (
                <label className="mt-3 flex items-start gap-3 rounded-xl bg-surface-100 p-3 text-sm text-navy-900">
                  <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]" checked={log.done} onChange={(event) => void toggle(log.id, event.target.checked)} />
                  <span><span className="font-bold">{t("markDone")}: </span>{log.homework}</span>
                </label>
              ) : null}
              {log.note ? <p className="mt-2 text-sm text-muted">{log.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
