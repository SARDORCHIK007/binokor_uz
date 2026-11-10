"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/site/NotificationBell";

export function AppTopbar({ onToggleSidebar, signedIn }: { onToggleSidebar: () => void; signedIn: boolean }) {
  const t = useTranslations("shell");
  const path = usePathname();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-navy-700 bg-navy-900 px-4 shadow-sh2 sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-700 text-white transition hover:bg-primary lg:hidden"
        aria-label={t("openMenu")}
      >
        <span className="text-lg" aria-hidden="true">☰</span>
      </button>

      {path !== "/" ? (
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-navy-700 px-3 text-sm font-bold text-white transition hover:bg-primary"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">{t("back")}</span>
          <span className="sr-only sm:hidden">{t("back")}</span>
        </button>
      ) : null}

      <form action="/qidiruv" method="GET" role="search" className="max-w-xl flex-1">
        <label className="sr-only" htmlFor="topbar-q">{t("search")}</label>
        <input
          id="topbar-q"
          type="search"
          name="q"
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl border border-navy-700 bg-navy-800 px-4 py-2 text-sm text-white placeholder:text-slate-400 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
