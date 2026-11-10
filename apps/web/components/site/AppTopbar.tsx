"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { NotificationBell } from "@/components/site/NotificationBell";

export function AppTopbar({ onToggleSidebar, signedIn }: { onToggleSidebar: () => void; signedIn: boolean }) {
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

      <form action="/qidiruv" method="GET" role="search" className="max-w-xl flex-1">
        <label className="sr-only" htmlFor="topbar-q">{t("search")}</label>
        <input
          id="topbar-q"
          type="search"
          name="q"
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl border border-line-strong bg-surface-100 px-4 py-2 text-sm text-navy-900 placeholder:text-muted transition focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </form>

      {signedIn ? <NotificationBell /> : null}

      <Link
        href="/ariza"
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:bg-primary-hover"
      >
        <span aria-hidden="true">+</span>
        <span className="hidden sm:inline">{t("apply")}</span>
      </Link>
    </header>
  );
}
