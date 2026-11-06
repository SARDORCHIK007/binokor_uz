"use client";

import { Button } from "@uychibinokor/ui";
import { useState } from "react";

export function DecisionButtons({ id }: { id: string }) {
  const [note, setNote] = useState("");

  async function send(status: string) {
    const response = await fetch(`/api/v1/admin/applications/${id}/decision`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason: note || null }),
    });
    if (response.ok) {
      window.location.reload();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="min-h-11 rounded-sm border border-line px-3"
        placeholder="Rad sababi"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <Button type="button" onClick={() => void send("ACCEPTED")}>
        Qabul
      </Button>
      <Button type="button" variant="danger" onClick={() => void send("REJECTED")}>
        Rad
      </Button>
    </div>
  );
}
