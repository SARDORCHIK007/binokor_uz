"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export function PassportPhoto({ hasPhoto }: { hasPhoto: boolean }) {
  const t = useTranslations("passportPage");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(method: "PUT" | "DELETE", body?: File) {
    setBusy(true);
    setFailed(false);
    const response = await fetch("/api/v1/me/passport/photo", { method, credentials: "include", body });
    if (response.ok) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setFailed(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={t("photoUpload")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void send("PUT", file);
          }}
        />
        <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {hasPhoto ? t("photoChange") : t("photoUpload")}
        </Button>
        {hasPhoto ? (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void send("DELETE")}>
            {t("photoRemove")}
          </Button>
        ) : null}
      </div>
      {failed ? <p role="alert" className="text-xs text-danger-600">{t("photoFailed")}</p> : null}
    </div>
  );
}
