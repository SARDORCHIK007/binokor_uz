"use client";

import { Button, EmptyState, OfflineBanner } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { initials } from "@/components/cabinet/kit";
import { enqueueAttendance, flushAttendance } from "@/lib/attendanceQueue";

type Row = {
  enrollment_id: string;
  name: string;
  status: string | null;
  site_hours: number | null;
};

const STATUSES = ["PRESENT", "LATE", "ABSENT_EXCUSED", "ABSENT_UNEXCUSED"] as const;
type Status = (typeof STATUSES)[number];

const ON: Record<Status, string> = {
  PRESENT: "border-success-600 bg-success-600 text-white",
  LATE: "border-accent bg-accent text-navy-900",
  ABSENT_EXCUSED: "border-primary bg-primary text-white",
  ABSENT_UNEXCUSED: "border-danger-600 bg-danger-600 text-white",
};

export function AttendanceSheet({ groupId }: { groupId: string }) {
  const t = useTranslations("att");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);
  const [offline, setOffline] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/learning/groups/${groupId}/attendance`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return (await response.json()) as { rows: Row[] };
      })
      .then((payload) => {
        if (active) setRows(payload.rows);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [groupId]);

  useEffect(() => {
    const sync = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) {
        void flushAttendance().then((count) => {
          if (count > 0) setNote({ kind: "ok", text: t("queueSent") });
        });
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [t]);

  const totals = useMemo(() => {
    const result = { present: 0, late: 0, absent: 0, unmarked: 0 };
    for (const row of rows ?? []) {
      if (row.status === null) result.unmarked += 1;
      else if (row.status === "LATE") result.late += 1;
      else if (row.status === "PRESENT") result.present += 1;
      else result.absent += 1;
    }
    return result;
  }, [rows]);

  function setStatus(enrollmentId: string, status: string) {
    setNote(null);
    setRows((current) => current?.map((row) => (row.enrollment_id === enrollmentId ? { ...row, status } : row)) ?? null);
  }

  function markAllPresent() {
    setNote(null);
    setRows((current) => current?.map((row) => ({ ...row, status: "PRESENT" })) ?? null);
  }

  async function save() {
    if (!rows) return;
    setSaving(true);
    const key = crypto.randomUUID();
    const body = JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      default_status: "PRESENT",
      default_site_hours: 4,
      exceptions: rows
        .filter((row) => row.status)
        .map((row) => ({
          enrollment_id: row.enrollment_id,
          status: row.status,
          site_hours: row.status === "PRESENT" || row.status === "LATE" ? 4 : 0,
        })),
    });
    const queue = async () => {
      await enqueueAttendance({ id: key, groupId, body });
      setOffline(true);
      setNote({ kind: "warn", text: t("savedOffline") });
    };
    if (!navigator.onLine) {
      await queue();
      setSaving(false);
      return;
    }
    try {
      const response = await fetch(`/api/v1/learning/groups/${groupId}/attendance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body,
      });
      setNote(response.ok ? { kind: "ok", text: t("saved") } : { kind: "error", text: t("saveFailed") });
    } catch {
      await queue();
    }
    setSaving(false);
  }

  if (failed) return <EmptyState title={t("loadFailed")} text={t("reload")} />;
  if (!rows) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label={t("loading")}>
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-20 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <EmptyState title={t("noStudents")} text={t("noStudentsText")} />;

  return (
    <div className="flex flex-col gap-4">
      {offline ? <OfflineBanner text={t("offline")} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 shadow-sh1">
        <p className="text-sm font-semibold text-navy-900">
          {t("summary", { present: totals.present, late: totals.late, absent: totals.absent })}
          {totals.unmarked > 0 ? <span className="mt-0.5 block text-xs font-normal text-muted">{t("notMarked", { n: totals.unmarked })}</span> : null}
        </p>
        <Button type="button" variant="secondary" onClick={markAllPresent}>
          ✓ {t("allPresent")}
        </Button>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.enrollment_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 shadow-sh1">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                {initials(row.name)}
              </span>
              <span className="truncate font-bold text-navy-900">{row.name}</span>
            </span>
            <span role="group" aria-label={row.name} className="flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={row.status === status}
                  className={`min-h-10 rounded-xl border px-3.5 text-sm font-bold transition active:scale-95 ${
                    row.status === status ? ON[status] : "border-line-strong bg-card text-navy-900 hover:border-primary hover:text-primary"
                  }`}
                  onClick={() => setStatus(row.enrollment_id, status)}
                >
                  {t(`status.${status}`)}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-sh2 lg:bottom-4">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? t("saving") : t("save")}
        </Button>
        {note ? (
          <p
            role="status"
            className={`text-sm font-semibold ${note.kind === "ok" ? "text-success-600" : note.kind === "warn" ? "text-warning-600" : "text-danger-600"}`}
          >
            {note.kind === "ok" ? "✓ " : ""}
            {note.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
