"use client";

import { buttonClass } from "@uychibinokor/ui";
import { useState } from "react";
import { initials } from "@/components/cabinet/kit";
import { send } from "@/lib/clientApi";

export type FreeWorker = { slug: string; name: string; user_id: string; trade: string; level: string; hours: number; rating: number | null };

/** Pick a free worker to propose for one vacancy. Shared by the employment office and the migration agency. */
export function ReferDialog({
  requestId,
  workers,
  labels,
  onClose,
  onDone,
}: {
  requestId: string;
  workers: FreeWorker[];
  labels: { title: string; ok: string; failed: string; close: string; hours: (n: number) => string; empty: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function refer(userId: string) {
    setBusy(userId);
    const result = await send("/api/v1/panels/refer", "POST", { request_id: requestId, worker_user_id: userId });
    setBusy(null);
    setNote(result.ok ? { ok: true, text: labels.ok } : { ok: false, text: labels.failed });
    if (result.ok) onDone();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={labels.title}>
      <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={onClose} aria-label={labels.close} />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-card p-5 shadow-sh3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-navy-900">{labels.title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg bg-surface-100 text-navy-900" aria-label={labels.close}>
            ✕
          </button>
        </div>
        {note ? (
          <p role="status" className={`mt-3 text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
            {note.text}
          </p>
        ) : null}
        {workers.length === 0 ? <p className="mt-4 text-sm text-muted">{labels.empty}</p> : null}
        <ul className="mt-4 flex flex-col gap-2">
          {workers.map((worker) => (
            <li key={worker.user_id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-100 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                {initials(worker.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy-900">{worker.name}</p>
                <p className="truncate text-xs text-muted">
                  {worker.trade} · {labels.hours(worker.hours)}
                  {worker.rating !== null ? ` · ★ ${worker.rating.toFixed(1)}` : ""}
                </p>
              </div>
              <button type="button" disabled={busy === worker.user_id} className={buttonClass({ variant: "secondary" })} onClick={() => void refer(worker.user_id)}>
                +
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
