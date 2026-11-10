"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** Light / dark switch. The choice lives in the ub_theme cookie so the server renders the right theme with no flash. */
export function ThemeToggle() {
  const t = useTranslations("shell");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `ub_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setDark(!dark);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      className="flex w-full items-center justify-between rounded-xl border border-line bg-surface-100 px-3 py-2 text-sm font-semibold text-navy-900 transition hover:border-primary hover:text-primary"
    >
      <span>{dark ? t("themeLight") : t("themeDark")}</span>
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
    </button>
  );
}
