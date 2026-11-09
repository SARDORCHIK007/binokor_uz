"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const links = [
  { href: "/", label: "Bosh sahifa" },
  { href: "/kasblar", label: "Kasblar" },
  { href: "/ustalar", label: "Ustalar" },
  { href: "/ish-beruvchilar", label: "Ish beruvchilar" },
  { href: "/hamkorlar", label: "Hamkorlar" },
  { href: "/yangiliklar", label: "Yangiliklar" },
];

export function HeaderClient({ name }: { name: string | null }) {
  const path = usePathname();
  if (path.startsWith("/kabinet")) {
    return null;
  }
  return (
    <header className="sticky top-0 z-30 bg-[#071833] text-white shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0" aria-label="UYCHI BINOKOR">
          <Logo />
        </Link>
        <nav className="ml-6 hidden items-center gap-6 text-sm font-medium lg:flex" aria-label="Asosiy">
          {links.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`border-b-2 py-1 ${active ? "border-[#F5B400] text-white" : "border-transparent text-white/80 hover:text-white"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:block">
            <LanguageSwitcher />
          </span>
          {name ? (
            <AccountMenu name={name} />
          ) : (
            <Link href="/kirish" className="rounded-xl bg-white px-5 py-2 text-sm font-bold text-[#071833] hover:bg-[#F5B400]">
              Kirish
            </Link>
          )}
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm lg:hidden" aria-label="Asosiy">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className={`shrink-0 ${path === item.href ? "text-[#F5B400]" : "text-white/85"}`}>
            {item.label}
          </Link>
        ))}
        <span className="ml-auto shrink-0 sm:hidden">
          <LanguageSwitcher />
        </span>
      </nav>
    </header>
  );
}
