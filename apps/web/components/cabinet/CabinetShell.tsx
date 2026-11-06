"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export type CabinetLink = { href: string; label: string };

export function CabinetShell({
  role,
  roles,
  items,
  children,
}: {
  role: string;
  roles: string[];
  items: CabinetLink[];
  children: ReactNode;
}) {
  const t = useTranslations("roles");
  const c = useTranslations("cabinet");
  const path = usePathname();
  const [open, setOpen] = useState(false);

  function choose(next: string) {
    document.cookie = `ub_role=${next}; path=/; max-age=2592000`;
    window.location.assign("/kabinet");
  }

  const nav = (
    <nav className="flex flex-col gap-1" aria-label={t(role as "admin")}>
      {items.map((item) => {
        const active = path === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-white text-navy-900" : "hover:bg-navy-800"}`}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="mx-auto grid min-h-screen max-w-[1440px] bg-[#F4F6F9] md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-navy-900 p-5 text-blue-50 md:block">{nav}</aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-3">
          <button type="button" className="min-h-11 rounded-sm border border-line px-3 text-sm md:hidden" onClick={() => setOpen(true)}>
            {c("menu")}
          </button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted">{c("role")}</span>
            <select
              className="min-h-11 rounded-sm border border-line bg-card px-2"
              value={role}
              onChange={(event) => choose(event.target.value)}
            >
              {roles.map((item) => (
                <option key={item} value={item}>
                  {t(item as "admin")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="px-4 py-6 pb-24 md:pb-6">{children}</div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-navy-900/40" aria-label={c("close")} onClick={() => setOpen(false)} />
          <div className="absolute top-0 bottom-0 left-0 w-64 bg-navy-900 p-4 text-blue-50">{nav}</div>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-card md:hidden" aria-label={t(role as "admin")}>
        {items.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className="min-w-0 flex-1 truncate px-1 py-3 text-center text-[11px] leading-tight">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
