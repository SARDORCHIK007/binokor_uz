import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon, type IconName } from "@/components/brand/Icon";
import { CABINET_MENUS } from "@/lib/menus";
import { apiAuth } from "@/lib/session";

type Stat = { label: string; value: string; tone: string };

const ICON: Record<string, IconName> = {
  ishberuvchi: "briefcase",
  mahsulotlar: "box",
  portfolio: "user",
  arizam: "doc",
  sertifikatlar: "award",
  kurator: "users",
  lugat: "book",
  "portfolio-tasdiq": "check",
};

async function statsFor(role: string, t: Awaited<ReturnType<typeof getTranslations>>): Promise<Stat[]> {
  const blue = "bg-blue-100 text-primary";
  const green = "bg-success-100 text-success-600";
  const amber = "bg-amber-100 text-warning-600";
  if (role === "employer_local") {
    const me = await apiAuth<{ employer: { verified: boolean } | null; requests: { candidates: number }[] }>("/api/v1/employers/me");
    if (!me?.employer) {
      return [];
    }
    return [
      { label: t("stat.requests"), value: String(me.requests.length), tone: blue },
      { label: t("stat.candidates"), value: String(me.requests.reduce((sum, item) => sum + Number(item.candidates ?? 0), 0)), tone: green },
      { label: t("stat.verified"), value: me.employer.verified ? t("verified") : t("unverified"), tone: me.employer.verified ? green : amber },
    ];
  }
  if (role === "producer") {
    const products = (await apiAuth<{ in_stock: boolean }[]>("/api/v1/producers/products")) ?? [];
    const orders = (await apiAuth<unknown[]>("/api/v1/producers/orders")) ?? [];
    return [
      { label: t("stat.products"), value: String(products.length), tone: blue },
      { label: t("stat.inStock"), value: String(products.filter((item) => item.in_stock).length), tone: green },
      { label: t("stat.orders"), value: String(orders.length), tone: amber },
    ];
  }
  if (role === "worker") {
    const mine = await apiAuth<{ items: { confirmed: boolean }[]; reviews: { count: number } }>("/api/v1/me/portfolio");
    if (!mine) {
      return [];
    }
    return [
      { label: t("stat.works"), value: String(mine.items.length), tone: blue },
      { label: t("stat.confirmed"), value: String(mine.items.filter((item) => item.confirmed).length), tone: green },
      { label: t("stat.reviews"), value: String(mine.reviews.count), tone: amber },
    ];
  }
  return [];
}

/** Home screen for roles without a dedicated dashboard (employer, producer, worker, officers). */
export async function RoleHome({ role, name }: { role: string; name: string }) {
  const t = await getTranslations("roleHome");
  const cabinet = await getTranslations("cabinet");
  const sub = ["employer_local", "producer", "worker"].includes(role) ? `${role === "employer_local" ? "employer" : role}.sub` : "other.sub";
  const stats = await statsFor(role, t);
  const links = (CABINET_MENUS[role] ?? []).filter((item) => item.key !== "panel");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("welcome", { name })}</h1>
        <p className="mt-2 text-muted">{t(sub as "other.sub")}</p>
      </div>
      {stats.length > 0 ? (
        <dl className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
              <dt className="text-sm font-semibold text-muted">{stat.label}</dt>
              <dd className={`mt-2 inline-block rounded-xl px-3 py-1 text-2xl font-extrabold tabular-nums ${stat.tone}`}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <section>
        <h2 className="mb-3 text-lg font-bold text-navy-900">{t("quick")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((item) => {
            const slug = item.href.split("/").pop() ?? "";
            return (
              <li key={item.href}>
                <Link href={item.href} className="group flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-sh1 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sh2">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary">
                    <Icon name={ICON[slug] ?? "grid"} className="size-5" />
                  </span>
                  <span className="flex-1 font-bold text-navy-900 group-hover:text-primary">{cabinet(item.key as "panel")}</span>
                  <Icon name="arrow" className="size-4 text-faint group-hover:text-primary" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
