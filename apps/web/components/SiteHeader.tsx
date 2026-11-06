import { getTranslations } from "next-intl/server";
import Link from "next/link";

const links = [
  { href: "/#loyiha", key: "project" },
  { href: "/#kasblar", key: "trades" },
  { href: "/verify/UB-2026-000123", key: "workers" },
  { href: "/tez-orada", key: "objects" },
  { href: "/tez-orada", key: "materials" },
] as const;

export async function SiteHeader() {
  const t = await getTranslations("nav");
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card">
      <div className="mx-auto max-w-[1200px] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold tracking-wide text-navy-900">
            UYCHI BINOKOR
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">{t("language")}</span>
            <Link href="/kabinet/panel" className="rounded-sm px-3 py-2 text-sm font-medium text-ink hover:bg-blue-50">
              {t("employers")}
            </Link>
            <Link
              href="/kirish"
              className="rounded-sm bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              {t("login")}
            </Link>
          </div>
        </div>
        <nav className="mt-2 flex gap-4 overflow-x-auto text-sm text-ink" aria-label={t("project")}>
          {links.map((item) => (
            <Link key={item.key} href={item.href} className="shrink-0 hover:text-primary">
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
