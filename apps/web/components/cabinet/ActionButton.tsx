"use client";

import { Button } from "@uychibinokor/ui";
import { useState } from "react";

type Props = {
  url: string;
  method?: "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  label: string;
  failed: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Where to go after success; the page reloads when omitted. */
  reload?: boolean;
};

/** A button that calls the API with the session cookie and reloads the page when it worked. */
export function ActionButton({ url, method = "POST", body, label, failed, variant, reload = true }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function run() {
    setBusy(true);
    setError(false);
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.ok && reload) {
      window.location.reload();
      return;
    }
    setBusy(false);
    setError(!response.ok);
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" variant={variant} disabled={busy} onClick={() => void run()}>
        {label}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger-600">
          {failed}
        </span>
      ) : null}
    </span>
  );
}
