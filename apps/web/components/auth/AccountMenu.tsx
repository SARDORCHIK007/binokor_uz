"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function AccountMenu({ name }: { name: string }) {
  const t = useTranslations("session");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="min-h-11 max-w-36 truncate rounded-sm bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {name}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-line bg-card py-1 shadow-sh2">
          <Link role="menuitem" href="/kabinet" className="block px-3 py-2 text-sm hover:bg-blue-50" onClick={() => setOpen(false)}>
            {t("title")}
          </Link>
          <button
            role="menuitem"
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
            onClick={() => {
              void fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" }).then(() => {
                window.location.assign("/");
              });
            }}
          >
            {t("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
