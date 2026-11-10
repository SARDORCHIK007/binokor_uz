"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function CertificateDecision({ id }: { id: string }) {
  const t = useTranslations("adm");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(decision: "APPROVE" | "REJECT") {
    setBusy(true);
    setFailed(false);
    const response = await fetch(`/api/v1/certificates/${id}/decisions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, comment: "" }),
    });
    if (response.ok) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setFailed(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" disabled={busy} onClick={() => void send("APPROVE")}>
        ✓ {t("certs.approve")}
      </Button>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => void send("REJECT")}>
        {t("certs.reject")}
      </Button>
      {failed ? (
        <span role="alert" className="text-xs text-danger-600">
          {t("failed")}
        </span>
      ) : null}
    </div>
  );
}
