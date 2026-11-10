import { PrintButton } from "@/components/PrintButton";
import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CARD, Meter, PageHead } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Report = {
  kpi: { applications: number; enrolled: number; certified: number; employed: number };
  trades: { trade: string; enrolled: number; certified: number }[];
};

export default async function ReportPage() {
  const t = await getTranslations("adm");
  const c = await getTranslations("cabinet");
  const m = await getTranslations("mahallas");
  const report = await apiAuth<Report>("/api/v1/reports/summary");
  if (!report) {
    return <EmptyState title={t("loadError")} text="" />;
  }
  const steps = [
    { label: c("kpiApplications"), value: report.kpi.applications, bar: "bg-primary" },
    { label: c("kpiEnrolled"), value: report.kpi.enrolled, bar: "bg-primary" },
    { label: c("kpiCertified"), value: report.kpi.certified, bar: "bg-success-600" },
    { label: c("kpiEmployed"), value: report.kpi.employed, bar: "bg-accent" },
  ];
  const peak = Math.max(1, ...steps.map((step) => step.value));
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={t("report.title")}
        text={t("report.text")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/kabinet/mahallalar" className={`${buttonClass({ variant: "secondary" })} print:hidden`}>
              {t("report.mahallas")} →
            </Link>
            <PrintButton label={m("print")} />
          </div>
        }
      />

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <div key={step.label} className={CARD}>
            <dt className="text-sm text-muted">{step.label}</dt>
            <dd className="mt-1 text-4xl font-extrabold text-navy-900 tabular-nums">{step.value}</dd>
          </div>
        ))}
      </dl>

      <section className={CARD} aria-labelledby="funnel">
        <h2 id="funnel" className="text-sm font-bold text-navy-900">
          {t("report.funnel")}
        </h2>
        <ol className="mt-4 flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_3rem]">
              <span className="truncate font-semibold text-navy-900">{step.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-surface-100">
                <span className={`block h-3 rounded-full transition-all duration-700 ${step.bar}`} style={{ width: `${Math.round((100 * step.value) / peak)}%` }} />
              </span>
              <span className="text-right font-bold tabular-nums text-navy-900">{step.value}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={CARD} aria-labelledby="by-trade">
        <h2 id="by-trade" className="text-sm font-bold text-navy-900">
          {t("report.byTrade")}
        </h2>
        {report.trades.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("report.empty")}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th scope="col" className="py-2 font-semibold">{t("report.trade")}</th>
                  <th scope="col" className="py-2 text-right font-semibold">{t("report.studying")}</th>
                  <th scope="col" className="py-2 text-right font-semibold">{t("report.certified")}</th>
                  <th scope="col" className="w-40 py-2 pl-4 font-semibold" aria-hidden="true" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.trades.map((item) => (
                  <tr key={item.trade}>
                    <th scope="row" className="py-2.5 text-left font-bold text-navy-900">{item.trade}</th>
                    <td className="py-2.5 text-right tabular-nums">{item.enrolled}</td>
                    <td className="py-2.5 text-right tabular-nums">{item.certified}</td>
                    <td className="py-2.5 pl-4">
                      <Meter value={item.enrolled > 0 ? (100 * item.certified) / item.enrolled : 0} tone="green" label={item.trade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
