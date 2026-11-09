"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Logo } from "@/components/brand/Logo";

export type CabinetLink = { href: string; label: string };

const ICONS: [string, IconName][] = [
  ["arizalar", "doc"],
  ["arizam", "doc"],
  ["kurslar", "book"],
  ["guruhlar", "users"],
  ["foydalanuvchilar", "user"],
  ["sertifikatlar", "award"],
  ["lugat", "book"],
  ["ishlar", "briefcase"],
  ["ishberuvchi", "briefcase"],
  ["hisobot", "chart"],
  ["buyurtmalar", "grid"],
  ["mahsulotlar", "grid"],
  ["davomat", "calendar"],
  ["baholar", "star"],
  ["imtihon", "doc"],
  ["kurator", "users"],
  ["/ariza", "doc"],
];

function iconFor(href: string): IconName {
  return ICONS.find(([key]) => href.includes(key))?.[1] ?? "grid";
}

export function CabinetShell({
  name,
  role,
  roles,
  items,
  children,
}: {
  name: string;
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
    <div>
      <Link href="/" className="mb-5 block" aria-label="UYCHI BINOKOR">
        <Logo />
      </Link>
      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#F5B400] font-bold text-[#071833]">
          {(name || "?").trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{name}</span>
          <span className="block truncate text-xs text-blue-200">{t(role as "admin")}</span>
        </span>
      </div>
      <nav className="flex flex-col gap-1" aria-label={t(role as "admin")}>
        {items.map((item) => {
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-[#2F6BFF] text-white" : "text-blue-100 hover:bg-white/10"}`}
              onClick={() => setOpen(false)}
            >
              <Icon name={iconFor(item.href)} className="size-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="mx-auto grid min-h-screen max-w-[1440px] bg-[#F4F7FB] md:grid-cols-[250px_1fr]">
      <aside className="hidden bg-[#071833] p-5 text-blue-50 md:block">{nav}</aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-3">
          <button type="button" className="min-h-11 rounded-sm border border-line px-3 text-sm md:hidden" onClick={() => setOpen(true)}>
            {c("menu")}
          </button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted">{c("role")}</span>
            <select
              className="min-h-11 rounded-xl border border-[#d9dfe8] bg-white px-2"
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
          <div className="absolute top-0 bottom-0 left-0 w-72 overflow-y-auto bg-[#071833] p-4 text-blue-50">{nav}</div>
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
