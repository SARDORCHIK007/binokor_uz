"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useEffect, useState } from "react";

type Module = { id: string; title: string };
type Score = { score: number; passed: boolean };
type Row = { enrollment_id: string; name: string; scores: Record<string, Score> };

export function GradeSheet({ groupId }: { groupId: string }) {
  const [modules, setModules] = useState<Module[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState("");

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

  async function save(enrollmentId: string, moduleId: string, score: number) {
    const response = await fetch("/api/v1/learning/assessments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        module_id: moduleId,
        score,
        passed: score >= 60,
        comment: "",
      }),
    });
    setNote(response.ok ? "Baho saqlandi" : "Saqlanmadi");
  }

  if (failed) {
    return <EmptyState title="Baholar ochilmadi" text="Sahifani yangilang." />;
  }
  if (!rows) {
    return <p className="p-4 text-sm text-muted">Yuklanmoqda</p>;
  }
  if (rows.length === 0) {
    return <EmptyState title="Tinglovchi yo'q" text="Bu guruhda baho qo'yiladigan tinglovchi yo'q." />;
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      {rows.map((row) => (
        <article key={row.enrollment_id} className="rounded-md border border-line bg-card p-3">
          <h2 className="font-semibold">{row.name}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {modules.map((module) => (
              <li key={module.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-28 text-sm">{module.title}</span>
                <span className="text-sm tabular-nums text-muted">
                  {row.scores[module.id] ? `${row.scores[module.id].score}` : "—"}
                </span>
                <Button type="button" variant="secondary" onClick={() => void save(row.enrollment_id, module.id, 80)}>
                  80
                </Button>
              </li>
            ))}
          </ul>
        </article>
      ))}
      {note ? <p className="text-sm">{note}</p> : null}
    </div>
  );
}
