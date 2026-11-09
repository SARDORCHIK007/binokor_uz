"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { ShellUser } from "@/components/site/SiteLayoutShell";

type NavItem = { href: string; label: string; icon: IconName; badge?: string };

const PORTAL_LINKS: NavItem[] = [
  { href: "/", label: "Bosh sahifa", icon: "grid" },
  { href: "/kasblar", label: "12 ta kasb", icon: "briefcase" },
  { href: "/ariza", label: "Onlayn ariza", icon: "doc" },
  { href: "/ustalar", label: "Ustalar katalogi", icon: "users" },
  { href: "/ish-beruvchilar", label: "Ish beruvchilar", icon: "globe" },
  { href: "/obyektlar", label: "Qurilish obyektlari", icon: "pin" },
  { href: "/materiallar", label: "Qurilish materiallari", icon: "grid" },
  { href: "/hamkorlar", label: "Hamkorlar", icon: "award" },
  { href: "/yangiliklar", label: "Yangiliklar", icon: "doc" },
  { href: "/qidiruv", label: "Sertifikatni tekshirish", icon: "qr" },
];

const CABINET_ICONS: [string, IconName][] = [
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
];

function cabinetIcon(href: string): IconName {
  return CABINET_ICONS.find(([key]) => href.includes(key))?.[1] ?? "grid";
}

function linkClass(active: boolean, tone: "blue" | "green") {
  const on = tone === "blue" ? "bg-[#2F6BFF] shadow-md shadow-[#2F6BFF]/30" : "bg-[#1f8a4c] shadow-md shadow-[#1f8a4c]/30";
  return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? `${on} text-white` : "text-white/80 hover:bg-white/10 hover:text-white"}`;
}

export function AppSidebar({ open, onClose, user }: { open: boolean; onClose: () => void; user: ShellUser | null }) {
  const path = usePathname();

  function chooseRole(next: string) {
    document.cookie = `ub_role=${next}; path=/; max-age=2592000`;
    window.location.assign("/kabinet");
  }

  function logout() {
    void fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" }).then(() => {
      window.location.assign("/kirish");
    });
  }

  const content = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-[#071833] p-4 text-white">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <Link href="/" onClick={onClose} aria-label="UYCHI BINOKOR">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg bg-white/10 text-white lg:hidden"
            aria-label="Yopish"
          >
            ✕
          </button>
        </div>

        {user && user.roles.length > 1 ? (
          <label className="block rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <span className="mb-2 block text-[11px] font-bold tracking-wider text-[#F5B400] uppercase">Faol rol</span>
            <select
              value={user.role}
              onChange={(event) => chooseRole(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#0b1f3a] px-3 py-2 text-sm font-semibold text-white focus:border-[#F5B400] focus:outline-none"
            >
              {user.roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div>
          <span className="px-3 text-[10px] font-extrabold tracking-widest text-white/50 uppercase">Platforma</span>
          <nav className="mt-2 space-y-1" aria-label="Platforma">
            {PORTAL_LINKS.map((item) => {
              const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={linkClass(active, "blue")}>
                  <Icon name={item.icon} className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {user ? (
          <div>
            <span className="px-3 text-[10px] font-extrabold tracking-widest text-[#F5B400]/80 uppercase">Shaxsiy kabinet</span>
            <nav className="mt-2 space-y-1" aria-label="Kabinet">
              {user.items.map((item) => {
                const active = path === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={linkClass(active, "green")}>
                    <Icon name={cabinetIcon(item.href)} className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
        <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
          <LanguageSwitcher />
        </div>
        {user ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F5B400] text-sm font-bold text-[#071833]">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-xs text-[#F5B400]">{user.roles.find((r) => r.id === user.role)?.label}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-[#F5B400] hover:text-[#071833]">
              Chiqish
            </button>
          </div>
        ) : (
          <Link href="/kirish" onClick={onClose} className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-[#071833] hover:bg-[#F5B400]">
            Kirish
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden shadow-2xl lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-72">{content}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" className="fixed inset-0 bg-black/70" onClick={onClose} aria-label="Yopish" />
          <div className="relative flex w-full max-w-xs flex-1 flex-col">{content}</div>
        </div>
      ) : null}
    </>
  );
}
