"use client";

import Link from "next/link";

export function AppTopbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-3 border-b border-line bg-white px-4 shadow-sm sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition hover:bg-primary lg:hidden"
        aria-label="Menyuni ochish"
      >
        <span className="text-lg" aria-hidden="true">☰</span>
      </button>

      <form action="/qidiruv" method="GET" role="search" className="max-w-xl flex-1">
        <label className="sr-only" htmlFor="topbar-q">Qidiruv</label>
        <input
          id="topbar-q"
          type="search"
          name="q"
          placeholder="Usta, material yoki sertifikat raqami (UB-2026-000001)"
          className="w-full rounded-xl border border-line-strong bg-canvas px-4 py-2 text-sm text-navy-900 placeholder:text-faint transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </form>

      <Link
        href="/ariza"
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:bg-primary-hover"
      >
        <span aria-hidden="true">+</span>
        <span className="hidden sm:inline">Onlayn ariza</span>
      </Link>
    </header>
  );
}
