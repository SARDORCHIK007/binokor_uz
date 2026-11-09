import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Report = {
  kpi: { applications: number; enrolled: number; certified: number; employed: number };
  trades: { trade: string; enrolled: number; certified: number }[];
};

export default async function ReportPage() {
  const t = await getTranslations("cabinet");
  const states = await getTranslations("states");
  const report = await apiAuth<Report>("/api/v1/reports/summary");
  if (!report) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const cards = [
    ["kpiApplications", report.kpi.applications],
    ["kpiEnrolled", report.kpi.enrolled],
    ["kpiCertified", report.kpi.certified],
    ["kpiEmployed", report.kpi.employed],
  ] as const;
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-3xl font-extrabold text-[#071833]">Hokimlik hisoboti</h1>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, value]) => (
          <div key={key} className="rounded-[20px] border border-[#e5eaf2] bg-white shadow-sm p-4">
            <dt className="text-sm text-muted">{t(key)}</dt>
            <dd className="text-3xl font-extrabold text-[#071833] tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {report.trades.length === 0 ? (
        <EmptyState title="Kasb yo'q" text="Hisobot uchun ma'lumot yo'q." />
      ) : (
        <ul className="flex flex-col gap-2">
          {report.trades.map((item) => (
            <li key={item.trade} className="rounded-2xl border border-[#e5eaf2] bg-white shadow-sm px-4 py-3">
              {item.trade} · o'qiyapti {item.enrolled} · sertifikat {item.certified}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
