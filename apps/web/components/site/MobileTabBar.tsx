"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/brand/Icon";

/** Bottom navigation for phones (hidden from lg up, where the sidebar is visible). */
export function MobileTabBar({ signedIn }: { signedIn: boolean }) {
  const nav = useTranslations("nav");
  const path = usePathname();
  const items: { href: string; label: string; icon: IconName; primary?: boolean }[] = [
    { href: "/", label: nav("home"), icon: "grid" },
    { href: "/kasblar", label: nav("trades"), icon: "briefcase" },
    { href: "/ariza", label: nav("apply"), icon: "doc", primary: true },
    { href: "/ustalar", label: nav("workers"), icon: "users" },
    signedIn
      ? { href: "/kabinet", label: nav("cabinet"), icon: "user" }
      : { href: "/kirish", label: nav("login"), icon: "user" },
  ];
  return (
    <nav
      aria-label={nav("menu")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] shadow-sh2 lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 pt-2 pb-1.5 text-[11px] font-semibold ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                {item.primary ? (
                  <span className="-mt-5 grid size-11 place-items-center rounded-full bg-primary text-white shadow-sh2 ring-4 ring-card">
                    <Icon name={item.icon} className="size-5" />
                  </span>
                ) : (
                  <Icon name={item.icon} className="size-5" />
                )}
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
