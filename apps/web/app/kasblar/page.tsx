import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const t = await getTranslations();
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  if (!home) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-16">
      <h1 className="text-5xl font-bold text-navy-900">{t("home.tradesTitle")}</h1>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {home.trades.map((trade) => (
          <li key={trade.code}>
            <Link href={`/kasblar/${trade.code}`} className="block rounded-[20px] bg-card p-5 shadow-sh2 transition-transform hover:-translate-y-1">
              <h2 className="text-xl font-semibold">{trade.name}</h2>
              <p className="mt-2 text-sm text-muted">
                {t("home.domestic")}: {trade.domestic_months} {t("home.months")}
              </p>
              <p className="text-sm text-muted">
                {t("home.foreign")}: {trade.domestic_months + trade.foreign_lang_months} {t("home.months")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
