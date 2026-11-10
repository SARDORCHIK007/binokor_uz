import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Row = { mahalla: string; people: number; studying: number; certified: number; workers: number };

export default async function MahallasPage() {
  const t = await getTranslations("mahallas");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const rows = await apiAuth<Row[]>(`/api/v1/reports/mahallas?lang=${locale}`);
  if (!rows) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const active = rows.filter((row) => row.people > 0 || row.workers > 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
          <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
        </div>
        <a href="/api/v1/reports/export.csv" className={buttonClass({ variant: "secondary" })}>
          ⤓ {t("export")}
        </a>
      </div>
      {active.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sh1">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">{t("name")}</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">{t("people")}</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">{t("studying")}</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">{t("certified")}</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">{t("workers")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {active.map((row) => (
                <tr key={row.mahalla}>
                  <th scope="row" className="px-4 py-3 text-left font-bold text-navy-900">{row.mahalla}</th>
                  <td className="px-4 py-3 text-right tabular-nums">{row.people}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.studying}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.certified}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.workers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
