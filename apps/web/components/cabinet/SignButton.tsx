"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function SignButton({ number, partner, name }: { number: string; partner: string; name: string }) {
  const t = useTranslations("signing");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function sign() {
    setBusy(true);
    setFailed(false);
    const response = await fetch(`/api/v1/certificates/${number}/sign`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner }),
    });
    if (response.ok) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setFailed(true);
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" disabled={busy} onClick={() => void sign()}>
        {t("sign")}<span className="sr-only"> {name}</span>
      </Button>
      {failed ? <span role="alert" className="text-xs text-danger-600">{t("failed")}</span> : null}
    </span>
  );
}
