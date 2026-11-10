"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ShellUser } from "@/components/site/SiteLayoutShell";

type NavItem = { href: string; label: string; icon: IconName; badge?: string };

const PORTAL_LINKS: NavItem[] = [
  { href: "/", label: "home", icon: "grid" },
  { href: "/kasblar", label: "trades", icon: "briefcase" },
  { href: "/ariza", label: "apply", icon: "doc" },
  { href: "/ustalar", label: "workers", icon: "users" },
  { href: "/ish-beruvchilar", label: "employers", icon: "globe" },
  { href: "/obyektlar", label: "objects", icon: "pin" },
  { href: "/materiallar", label: "materials", icon: "grid" },
  { href: "/hamkorlar", label: "partners", icon: "award" },
  { href: "/yangiliklar", label: "news", icon: "doc" },
  { href: "/qidiruv", label: "verify", icon: "qr" },
];

const CABINET_ICONS: [string, IconName][] = [
  ["arizalar", "doc"],
  ["arizam", "doc"],
  ["pasport", "qr"],
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
  ["takliflar", "briefcase"],
  ["profil-usta", "user"],
  ["saralanganlar", "star"],
  ["statistika", "chart"],
  ["mahallalar", "pin"],
  ["tinglovchilar", "users"],
  ["yutuqlarim", "star"],
  ["bildirishnomalar", "doc"],
  ["sozlamalar", "grid"],
  ["jadval", "calendar"],
  ["elonlar", "doc"],
];

function cabinetIcon(href: string): IconName {
  return CABINET_ICONS.find(([key]) => href.includes(key))?.[1] ?? "grid";
}

function linkClass(active: boolean, tone: "blue" | "green") {
  const on = tone === "blue" ? "bg-primary shadow-md shadow-primary/30" : "bg-primary shadow-md shadow-primary/30";
  return `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? `${on} text-white` : "text-white/80 hover:bg-white/10 hover:text-white"}`;
}

export function AppSidebar({ open, onClose, user }: { open: boolean; onClose: () => void; user: ShellUser | null }) {
  const path = usePathname();
  const t = useTranslations("shell");

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
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-navy-900 p-4 text-white">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <Link href="/" onClick={onClose} aria-label="UYCHI BINOKOR">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg bg-white/10 text-white lg:hidden"
            aria-label={t("close")}
          >
            ✕
          </button>
        </div>

        {user && user.roles.length > 1 ? (
          <label className="block rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <span className="mb-2 block text-[11px] font-bold tracking-wider text-accent uppercase">{t("activeRole")}</span>
            <select
              value={user.role}
              onChange={(event) => chooseRole(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-navy-800 px-3 py-2 text-sm font-semibold text-white focus:border-accent focus:outline-none"
            >
              {user.roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {user ? (
          <div>
            <span className="px-3 text-[10px] font-extrabold tracking-widest text-accent/80 uppercase">{t("cabinet")}</span>
            <nav className="mt-2 space-y-1" aria-label={t("cabinet")}>
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
        {user ? (
          <details className="group rounded-2xl bg-navy-800 px-1 py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[10px] font-extrabold tracking-widest text-white/60 uppercase">
              {t("platform")}
              <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
            </summary>
            <nav className="space-y-1 pb-2" aria-label={t("platform")}>
              {PORTAL_LINKS.map((item) => {
                const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={linkClass(active, "blue")}>
                    <Icon name={item.icon} className="size-4 shrink-0" />
                    {t(item.label as "home")}
                  </Link>
                );
              })}
            </nav>
          </details>
        ) : (
        <div>
          <span className="px-3 text-[10px] font-extrabold tracking-widest text-white/50 uppercase">{t("platform")}</span>
          <nav className="mt-2 space-y-1" aria-label={t("platform")}>
            {PORTAL_LINKS.map((item) => {
              const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={linkClass(active, "blue")}>
                  <Icon name={item.icon} className="size-4 shrink-0" />
                  {t(item.label as "home")}
                </Link>
              );
            })}
          </nav>
        </div>
        )}
      </div>

      <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
        <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-navy-900">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate text-xs text-accent">{user.roles.find((r) => r.id === user.role)?.label}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-accent hover:text-navy-900">
              {t("logout")}
            </button>
          </div>
        ) : (
          <Link href="/kirish" onClick={onClose} className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-navy-900 hover:bg-accent">
            {t("login")}
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
          <button type="button" className="fixed inset-0 bg-black/70" onClick={onClose} aria-label={t("close")} />
          <div className="relative flex w-full max-w-xs flex-1 flex-col">{content}</div>
        </div>
      ) : null}
    </>
  );
}
