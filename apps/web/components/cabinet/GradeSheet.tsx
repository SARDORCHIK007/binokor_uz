"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge, initials } from "@/components/cabinet/kit";

type Criterion = { label: string; points: number };
type Module = { id: string; title: string; rubric: { criteria?: Criterion[] } };
type Score = { score: number; passed: boolean; comment: string; evidence_count: number };
type Row = { enrollment_id: string; name: string; scores: Record<string, Score> };

export function GradeSheet({ groupId }: { groupId: string }) {
  const t = useTranslations("grs");
  const [modules, setModules] = useState<Module[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Record<string, { score: string; comment: string; marks: boolean[] }>>({});
  const [files, setFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/learning/groups/${groupId}/grades`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("load");
        }
        return (await response.json()) as { modules: Module[]; rows: Row[] };
      })
      .then((payload) => {
        if (active) {
          setModules(payload.modules);
          setRows(payload.rows);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [groupId]);

  function keyOf(enrollmentId: string, moduleId: string) {
    return `${enrollmentId}:${moduleId}`;
  }

  function current(enrollmentId: string, moduleId: string, criteria: Criterion[]) {
    return (
      draft[keyOf(enrollmentId, moduleId)] ?? {
        score: "",
        comment: "",
        marks: criteria.map(() => false),
      }
    );
  }

  function update(enrollmentId: string, moduleId: string, criteria: Criterion[], next: { score: string; comment: string; marks: boolean[] }) {
    const sum = criteria.reduce((total, item, index) => total + (next.marks[index] ? item.points : 0), 0);
    setDraft((state) => ({
      ...state,
      [keyOf(enrollmentId, moduleId)]: { ...next, score: String(sum) },
    }));
  }

  async function save(enrollmentId: string, moduleId: string, criteria: Criterion[]) {
    const value = current(enrollmentId, moduleId, criteria);
    const score = Number(value.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      setNote(t("rangeError"));
      return;
    }
    const evidenceId: string | null = files[keyOf(enrollmentId, moduleId)] ?? null;
    const response = await fetch("/api/v1/learning/assessments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        score,
        passed: score >= 60,
        comment: value.comment,
        evidence_file_id: evidenceId,
      }),
    });
    setNote(response.ok ? t("savedOk") : t("saveFailed"));
  }

  async function attach(enrollmentId: string, moduleId: string, file: File) {
    const data = await file.arrayBuffer();
    const bytes = new Uint8Array(data);
    let binary = "";
    bytes.forEach((item) => {
      binary += String.fromCharCode(item);
    });
    const response = await fetch("/api/v1/learning/evidence", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: file.type, data_base64: btoa(binary) }),
    });
    if (!response.ok) {
      setNote(t("photoFailed"));
      return;
    }
    const payload = (await response.json()) as { id: string };
    setFiles((state) => ({ ...state, [keyOf(enrollmentId, moduleId)]: payload.id }));
    setNote(t("photoAttached"));
  }

  if (failed) {
    return <EmptyState title={t("loadFailed")} text={t("reload")} />;
  }
  if (!rows) {
    return <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}><div className="h-32 animate-pulse rounded-2xl bg-card" /><div className="h-32 animate-pulse rounded-2xl bg-card" /></div>;
  }
  if (rows.length === 0) {
    return <EmptyState title={t("noStudents")} text={t("noStudentsText")} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <article key={row.enrollment_id} className="rounded-2xl border border-line bg-card p-4 shadow-sh1">
          <h2 className="flex items-center gap-3 font-bold text-navy-900">
            <span className="grid size-10 place-items-center rounded-full bg-blue-100 text-sm text-primary" aria-hidden="true">{initials(row.name)}</span>
            {row.name}
          </h2>
          <ul className="mt-3 flex flex-col gap-4">
            {modules.map((module) => {
              const criteria = module.rubric.criteria ?? [];
              const value = current(row.enrollment_id, module.id, criteria);
              const saved = row.scores[module.id];
              return (
                <li key={module.id} className="rounded-xl border border-line bg-canvas p-4">
                  <p className="font-bold text-navy-900">{module.title}</p>
                  {saved ? (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <Badge tone={saved.passed ? "green" : "red"}>{saved.passed ? t("passed") : t("failed")}</Badge>
                      {t("saved", { score: saved.score, result: saved.passed ? t("passed") : t("failed"), n: saved.evidence_count })}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-col gap-2">
                    {criteria.map((item, index) => (
                      <label key={item.label} className="flex min-h-11 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 accent-[var(--primary)]"
                          checked={value.marks[index] ?? false}
                          onChange={() => {
                            const marks = [...value.marks];
                            marks[index] = !marks[index];
                            update(row.enrollment_id, module.id, criteria, { ...value, marks });
                          }}
                        />
                        {item.label} · {item.points}
                      </label>
                    ))}
                  </div>
                  <label className="mt-2 block text-sm">
                    {t("score")}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={value.score}
                      onChange={(event) =>
                        setDraft((state) => ({
                          ...state,
                          [keyOf(row.enrollment_id, module.id)]: { ...value, score: event.target.value },
                        }))
                      }
                      className="mt-1 min-h-11 w-28 rounded-xl border border-line-strong bg-card px-3.5"
                    />
                  </label>
                  <label className="mt-2 block text-sm">
                    {t("comment")}
                    <textarea
                      value={value.comment}
                      onChange={(event) =>
                        setDraft((state) => ({
                          ...state,
                          [keyOf(row.enrollment_id, module.id)]: { ...value, comment: event.target.value },
                        }))
                      }
                      className="mt-1 min-h-20 w-full rounded-xl border border-line-strong bg-card px-3.5 py-2"
                    />
                  </label>
                  <label className="mt-2 block text-sm">
                    {t("evidence")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="mt-1 block"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void attach(row.enrollment_id, module.id, file);
                        }
                      }}
                    />
                  </label>
                  <Button type="button" className="mt-3" onClick={() => void save(row.enrollment_id, module.id, criteria)}>
                    {t("save")}
                  </Button>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
      {note ? <p role="status" className="sticky bottom-20 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white shadow-sh2 lg:bottom-4">{note}</p> : null}
    </div>
  );
}
