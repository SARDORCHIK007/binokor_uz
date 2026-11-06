"use client";

import { Button } from "@uychibinokor/ui";

export function LogoutButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => {
        void fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" }).then(() => {
          window.location.assign("/kirish");
        });
      }}
    >
      {label}
    </Button>
  );
}
