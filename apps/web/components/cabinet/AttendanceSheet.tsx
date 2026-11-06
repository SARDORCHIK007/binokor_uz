"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useEffect, useState } from "react";

type Row = {
  enrollment_id: string;
  name: string;
  status: string | null;
  site_hours: number | null;
};

const STATUSES = ["PRESENT", "LATE", "ABSENT_EXCUSED", "ABSENT_UNEXCUSED"] as const;

export function AttendanceSheet({ groupId }: { groupId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/v1/learning/groups/${groupId}/attendance`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("load");
        }
        return (await response.json()) as { rows: Row[] };
      })
      .then((payload) => {
        if (active) {
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

  function setStatus(enrollmentId: string, status: string) {
    setRows((current) =>
      current?.map((row) => (row.enrollment_id === enrollmentId ? { ...row, status } : row)) ?? null,
    );
  }

  async function save() {
    if (!rows) {
      return;
    }
    const response = await fetch(`/api/v1/learning/groups/${groupId}/attendance`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
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
      }),
    });
    setNote(response.ok ? "Saqlandi" : "Saqlanmadi");
  }

  if (failed) {
    return <EmptyState title="Varaq ochilmadi" text="Sahifani yangilang." />;
  }
  if (!rows) {
    return <p className="p-4 text-sm text-muted">Yuklanmoqda</p>;
  }
  if (rows.length === 0) {
    return <EmptyState title="Tinglovchi yo'q" text="Bu guruhda faol tinglovchi yo'q." />;
  }
  return (
    <div className="p-4">
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.enrollment_id} className="rounded-md border border-line bg-card p-3">
            <p className="font-semibold">{row.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`min-h-11 rounded-sm border px-3 text-sm ${row.status === status ? "border-navy-900 bg-navy-900 text-white" : "border-line"}`}
                  onClick={() => setStatus(row.enrollment_id, status)}
                >
                  {status === "PRESENT"
                    ? "Keldi"
                    : status === "LATE"
                      ? "Kechikdi"
                      : status === "ABSENT_EXCUSED"
                        ? "Sababli"
                        : "Kelmadi"}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={() => void save()}>
          Saqlash
        </Button>
        {note ? <p className="text-sm">{note}</p> : null}
      </div>
    </div>
  );
}
