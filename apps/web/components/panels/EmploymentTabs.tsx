import { getTranslations } from "next-intl/server";
import Link from "next/link";

/** Sub-navigation shared by the employment office pages. */
export async function EmploymentTabs({ active }: { active: "overview" | "registry" | "add" | "payments" }) {
  const t = await getTranslations("ep");
  const items = [
    ["overview", "/kabinet/bandlik", t("tab.overview")],
    ["registry", "/kabinet/bandlik/reestr", t("tab.registry")],
    ["add", "/kabinet/bandlik/qoshish", t("tab.add")],
    ["payments", "/kabinet/bandlik/tolovlar", t("tab.payments")],
  ] as const;
  return (
    <nav aria-label="employment" className="flex flex-wrap gap-2">
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
