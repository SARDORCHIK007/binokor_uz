import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Trade = {
  code: string;
  name: string;
  domestic_months: number;
  foreign_lang_months: number;
};

export default async function TradePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getTranslations();
  const trade = await apiGet<Trade>(`/api/v1/public/trades/${code}`);
  if (!trade) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </div>
    );
  }
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">{trade.name}</h1>
      <p className="mt-4 text-muted">
        {t("home.domestic")}: {trade.domestic_months} {t("home.months")}. {t("home.foreign")}:{" "}
        {trade.domestic_months + trade.foreign_lang_months} {t("home.months")}.
      </p>
      <p className="mt-2 text-muted">{t("home.destinationsText")}</p>
      <Link href="/#balans" className={`${buttonClass()} mt-6`}>
        {t("home.apply")}
      </Link>
    </article>
  );
}
