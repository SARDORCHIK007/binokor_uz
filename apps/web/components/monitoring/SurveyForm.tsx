"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, CARD } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type SurveyData = {
  round: string;
  criteria: string[];
  teachers: { group_id: string; group: string; teacher: string; done: boolean }[];
};

function Stars({ value, onChange, label }: { value: number; onChange: (next: number) => void; label: string }) {
  const t = useTranslations("sv");
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t("star", { n })}
          onClick={() => onChange(n)}
          className={`grid size-10 place-items-center rounded-lg border text-lg transition ${value >= n ? "border-accent bg-accent text-navy-900" : "border-line-strong bg-card text-muted hover:border-accent"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function SurveyForm({ initial }: { initial: SurveyData }) {
  const t = useTranslations("sv");
  const mon = useTranslations("mon");
  const [teachers, setTeachers] = useState(initial.teachers);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(groupId: string) {
    setBusy(groupId);
    setNote(null);
    const result = await send("/api/v1/me/teacher-survey", "POST", { group_id: groupId, scores: scores[groupId] ?? {}, comment: comments[groupId] ?? "" });
    setBusy(null);
    if (result.ok) {
      setNote({ ok: true, text: t("saved") });
      setTeachers((current) => current.map((item) => (item.group_id === groupId ? { ...item, done: true } : item)));
    } else {
      setNote({ ok: false, text: t("failed") });
    }
  }

  if (teachers.length === 0) return <EmptyState title={t("none")} text="" />;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm font-semibold text-muted">{t("round", { round: initial.round })}</p>
      {note ? (
        <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
          {note.ok ? "✓ " : ""}
          {note.text}
        </p>
      ) : null}
      {teachers.map((item) => (
        <section key={item.group_id} className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-navy-900">{t("teacherOf", { teacher: item.teacher, group: item.group })}</h2>
            {item.done ? <Badge tone="green">✓ {t("done")}</Badge> : null}
          </div>
          {item.done ? null : (
            <>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {initial.criteria.map((key) => (
                  <li key={key} className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-navy-900">{mon(`criteria.${key}` as "criteria.expertise")}</span>
                    <Stars
                      value={scores[item.group_id]?.[key] ?? 0}
                      label={mon(`criteria.${key}` as "criteria.expertise")}
                      onChange={(next) => setScores((current) => ({ ...current, [item.group_id]: { ...current[item.group_id], [key]: next } }))}
                    />
                  </li>
                ))}
              </ul>
              <label className="mt-4 flex flex-col gap-1 text-sm font-semibold text-muted">
                {t("comment")}
                <textarea
                  rows={3}
                  maxLength={1500}
                  value={comments[item.group_id] ?? ""}
                  onChange={(event) => setComments((current) => ({ ...current, [item.group_id]: event.target.value }))}
                  className={`${FIELD} py-2`}
                />
              </label>
              <div className="mt-4">
                <Button type="button" disabled={busy === item.group_id} onClick={() => void submit(item.group_id)}>
                  {busy === item.group_id ? t("sending") : t("submit")}
                </Button>
              </div>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
