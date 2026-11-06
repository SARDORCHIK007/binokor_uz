"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const primary = [
  { href: "/loyiha", key: "project" },
  { href: "/kasblar", key: "trades" },
  { href: "/ustalar", key: "workers" },
  { href: "/kabinet/ishberuvchi", key: "employers" },
] as const;

const more = [
  { href: "/yonalishlar", key: "directions" },
  { href: "/hamkorlar", key: "partners" },
  { href: "/brigadalar", key: "brigades" },
  { href: "/obyektlar", key: "objects" },
  { href: "/materiallar", key: "materials" },
  { href: "/yangiliklar", key: "news" },
  { href: "/aloqa", key: "contact" },
] as const;

export function HeaderClient({ name }: { name: string | null }) {
  const t = useTranslations("nav");
  const path = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (path.startsWith("/kabinet")) {
    return null;
  }
  return (
    <header className={`sticky top-0 z-30 transition-colors ${solid ? "bg-white shadow-sh2" : "bg-[#F4F6F9]/80"}`}>
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-sm font-bold tracking-[0.14em] text-navy-900">
          UYCHI BINOKOR
        </Link>
        <nav className="ml-4 hidden items-center gap-5 text-sm font-medium text-navy-900 lg:flex" aria-label={t("project")}>
          {primary.map((item) => (
            <Link key={item.key} href={item.href} className="hover:text-primary">
              {t(item.key)}
            </Link>
          ))}
          <div className="relative">
            <button type="button" className="hover:text-primary" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              {t("more")}
            </button>
            {open ? (
              <div className="absolute top-8 left-0 z-40 w-52 rounded-lg bg-white p-2 shadow-sh3">
                {more.map((item) => (
                  <Link key={item.key} href={item.href} className="block rounded-md px-3 py-2 hover:bg-blue-50" onClick={() => setOpen(false)}>
                    {t(item.key)}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          {name ? (
            <AccountMenu name={name} />
          ) : (
            <Link href="/kirish" className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white">
              {t("login")}
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm lg:hidden" aria-label={t("project")}>
        {[...primary, ...more].map((item) => (
          <Link key={item.key} href={item.href} className="shrink-0 text-navy-900">
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
