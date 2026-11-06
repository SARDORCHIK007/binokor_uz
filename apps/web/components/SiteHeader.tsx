import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { readSession } from "@/lib/session";

const links = [
  { href: "/loyiha", key: "project" },
  { href: "/kasblar", key: "trades" },
  { href: "/yonalishlar", key: "directions" },
  { href: "/hamkorlar", key: "partners" },
  { href: "/ustalar", key: "workers" },
  { href: "/brigadalar", key: "brigades" },
  { href: "/obyektlar", key: "objects" },
  { href: "/materiallar", key: "materials" },
  { href: "/yangiliklar", key: "news" },
  { href: "/aloqa", key: "contact" },
] as const;

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const session = await readSession();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card">
      <div className="mx-auto max-w-[1200px] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/" className="shrink-0 text-sm font-bold tracking-wide text-navy-900">
            UYCHI BINOKOR
          </Link>
          <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1">
            <LanguageSwitcher />
            <Link href="/kabinet/panel" className="rounded-sm px-2 py-2 text-sm font-medium text-ink hover:bg-blue-50">
              {t("employers")}
            </Link>
            {session ? (
              <AccountMenu name={session.full_name} />
            ) : (
              <Link
                href="/kirish"
                className="rounded-sm bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                {t("login")}
              </Link>
            )}
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
