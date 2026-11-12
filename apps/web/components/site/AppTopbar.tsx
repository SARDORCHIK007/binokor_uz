"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageMenu } from "@/components/LanguageMenu";
import { NotificationBell } from "@/components/site/NotificationBell";

export function AppTopbar({ onToggleSidebar, onSearch, signedIn }: { onToggleSidebar: () => void; onSearch: () => void; signedIn: boolean }) {
  const t = useTranslations("shell");
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-line bg-card px-4 shadow-sh1 sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-100 text-navy-900 transition hover:border-primary hover:text-primary lg:hidden"
        aria-label={t("openMenu")}
      >
        <span className="text-lg" aria-hidden="true">☰</span>
      </button>

      <button
        type="button"
        onClick={onSearch}
        aria-label={t("paletteTitle")}
        className="flex h-10 w-full min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-line-strong bg-surface-100 px-3 text-left text-sm text-muted transition hover:border-primary"
      >
        <span aria-hidden="true">⌕</span>
        <span className="min-w-0 flex-1 truncate">{t("searchPlaceholder")}</span>
        <kbd className="hidden rounded-md border border-line bg-card px-1.5 py-0.5 text-[11px] font-bold sm:inline">Ctrl K</kbd>
      </button>

      <LanguageMenu />

      {signedIn ? <NotificationBell /> : null}

      {signedIn ? null : (
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/kirish?royxat=1"
            className="hidden rounded-xl border border-line-strong bg-card px-4 py-2 text-sm font-bold text-navy-900 transition hover:border-primary hover:text-primary xl:block"
          >
            {t("register")}
          </Link>
          <Link
            href="/kirish"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:bg-primary-hover"
          >
            {t("login")}
          </Link>
        </div>
      )}
    </header>
  );
}
