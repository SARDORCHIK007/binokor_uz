import { getTranslations } from "next-intl/server";
import Link from "next/link";

/** Sub-navigation shared by the migration agency pages. */
export async function MigrationTabs({ active }: { active: "overview" | "pool" | "firms" }) {
  const t = await getTranslations("ag");
  const items = [
    ["overview", "/kabinet/migratsiya", t("tabOverview")],
    ["pool", "/kabinet/migratsiya/nomzodlar", t("tabPool")],
    ["firms", "/kabinet/migratsiya/firmalar", t("tabFirms")],
  ] as const;
  return (
    <nav aria-label="migration" className="flex flex-wrap gap-2">
      {items.map(([key, href, label]) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-sm font-bold ${active === key ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
