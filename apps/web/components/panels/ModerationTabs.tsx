import { getTranslations } from "next-intl/server";
import Link from "next/link";

/** Sub-navigation of the moderation pages. */
export async function ModerationTabs({ active }: { active: "queue" | "news" | "audit" }) {
  const t = await getTranslations("mod");
  const items = [
    ["queue", "/kabinet/moderatsiya", t("tab.queue")],
    ["news", "/kabinet/moderatsiya/yangiliklar", t("tab.news")],
    ["audit", "/kabinet/moderatsiya/jurnal", t("tab.audit")],
  ] as const;
  return (
    <nav aria-label="moderation" className="flex flex-wrap gap-2">
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
