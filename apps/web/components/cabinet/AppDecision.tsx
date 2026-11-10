"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** Accept / reject an application; rejection asks for an optional reason first. */
export function AppDecision({ id }: { id: string }) {
  const t = useTranslations("adm");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(status: "ACCEPTED" | "REJECTED") {
    setBusy(true);
    setFailed(false);
    const response = await fetch(`/api/v1/admin/applications/${id}/decision`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason: reason.trim() || null }),
    });
    if (response.ok) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setFailed(true);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {rejecting ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("reason")}
            aria-label={t("reason")}
            className="min-h-11 w-56 rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <Button type="button" variant="danger" disabled={busy} onClick={() => void send("REJECTED")}>
            {t("confirmReject")}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
            {t("cancel")}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="button" disabled={busy} onClick={() => void send("ACCEPTED")}>
            ✓ {t("accept")}
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setRejecting(true)}>
            {t("reject")}
          </Button>
        </div>
      )}
      {failed ? (
        <span role="alert" className="text-xs text-danger-600">
          {t("failed")}
        </span>
      ) : null}
    </div>
  );
}
