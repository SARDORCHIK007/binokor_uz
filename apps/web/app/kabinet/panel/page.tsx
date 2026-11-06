import { buttonClass } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { funnel } from "@/lib/demo";

const nav = [
  { href: "/kabinet/panel", label: "navPanel" },
  { href: "/kabinet/davomat", label: "navAttendance" },
  { href: "/verify/UB-2026-000123", label: "navCertificate" },
] as const;

export default async function AdminPage() {
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto grid max-w-[1440px] gap-0 lg:grid-cols-[220px_1fr]">
      <aside className="bg-navy-900 p-4 text-blue-50 lg:min-h-[80vh]">
        <p className="text-xs tracking-wide text-blue-100 uppercase">{t("links")}</p>
        <nav className="mt-3 flex flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-sm px-3 py-2 text-sm hover:bg-navy-800">
              {t(item.label)}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold text-navy-900">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("demoNote")}</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-card p-4 shadow-sh1">
            <dt className="text-sm text-muted">{t("kpiAccepted")}</dt>
            <dd className="text-3xl font-bold tabular-nums">412</dd>
          </div>
          <div className="rounded-md border border-line bg-card p-4 shadow-sh1">
            <dt className="text-sm text-muted">{t("kpiFinished")}</dt>
            <dd className="text-3xl font-bold tabular-nums">86%</dd>
          </div>
          <div className="rounded-md border border-line bg-card p-4 shadow-sh1">
            <dt className="text-sm text-muted">{t("kpiWorking")}</dt>
            <dd className="text-3xl font-bold tabular-nums">71%</dd>
          </div>
        </dl>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-md border border-line bg-card p-4 shadow-sh1">
            <h2 className="font-semibold">{t("funnel")}</h2>
            <ol className="mt-4 flex flex-wrap gap-2">
              {funnel.map((item) => (
                <li key={item.labelKey} className="rounded-sm bg-blue-50 px-3 py-2">
                  <p className="text-lg font-bold tabular-nums">{item.value}</p>
                  <p className="text-xs text-muted">{t(item.labelKey)}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-md border border-line bg-card p-4 shadow-sh1">
            <h2 className="font-semibold">{t("queue")}</h2>
            <p className="mt-3 text-lg">{t("queueCount")}</p>
            <Link href="/verify/UB-2026-000123" className={buttonClass({ variant: "secondary", className: "mt-4" })}>
              {t("openQueue")}
            </Link>
          </section>
          <section className="rounded-md border border-line bg-card p-4 shadow-sh1">
            <h2 className="font-semibold">{t("sla")}</h2>
            <p className="mt-3 text-danger-600">{t("slaLate")}</p>
          </section>
          <section className="rounded-md border border-warning-100 bg-warning-100 p-4">
            <h2 className="font-semibold text-warning-600">{t("alerts")}</h2>
            <p className="mt-2">{t("alertsText")}</p>
            <Link href="/kabinet/davomat" className={buttonClass({ className: "mt-4" })}>
              {t("openAttendance")}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
