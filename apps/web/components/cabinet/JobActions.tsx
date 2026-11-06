"use client";

import { Button } from "@uychibinokor/ui";

const NEXT: Record<string, string> = {
  NEW: "IN_REVIEW",
  IN_REVIEW: "SHORTLIST_SENT",
  SHORTLIST_SENT: "EMPLOYER_APPROVED",
  EMPLOYER_APPROVED: "MATCHED",
  MATCHED: "CLOSED",
};

const LABEL: Record<string, string> = {
  NEW: "Yangi",
  IN_REVIEW: "Ko'rilmoqda",
  SHORTLIST_SENT: "Ro'yxat yuborildi",
  EMPLOYER_APPROVED: "Ish beruvchi tasdiqladi",
  MATCHED: "Moslashtirildi",
  CLOSED: "Yopildi",
};

export function RequestMove({ id, status }: { id: string; status: string }) {
  const next = NEXT[status];
  async function move() {
    if (!next) {
      return;
    }
    const response = await fetch(`/api/v1/jobs/requests/${id}/transition`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (response.ok) {
      window.location.reload();
    }
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-sm">{LABEL[status] ?? status}</span>
      {next ? (
        <Button type="button" variant="secondary" onClick={() => void move()}>
          {LABEL[next] ?? next}
        </Button>
      ) : null}
    </div>
  );
}

export function PlacementReview({ id, saved }: { id: string; saved: boolean }) {
  async function send() {
    const response = await fetch(`/api/v1/jobs/placements/${id}/review`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quality: 5,
        discipline: 4,
        safety: 5,
        communication: 4,
        comment: "Ish yakunlandi",
      }),
    });
    if (response.ok) {
      window.location.reload();
    }
  }
  if (saved) {
    return <p className="text-sm text-muted">Baho yozilgan</p>;
  }
  return (
    <Button type="button" variant="secondary" onClick={() => void send()}>
      Baho 5/4/5/4
    </Button>
  );
}
