"use client";

import { Button } from "@uychibinokor/ui";

export function CertificateDecision({ id }: { id: string }) {
  async function send(decision: "APPROVE" | "REJECT") {
    const response = await fetch(`/api/v1/certificates/${id}/decisions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment: "" }),
    });
    if (response.ok) {
      window.location.reload();
    }
  }

  return (
    <div className="flex gap-2">
      <Button type="button" onClick={() => void send("APPROVE")}>
        Tasdiqlash
      </Button>
      <Button type="button" variant="danger" onClick={() => void send("REJECT")}>
        Rad
      </Button>
    </div>
  );
}
