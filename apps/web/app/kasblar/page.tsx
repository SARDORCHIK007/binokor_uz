import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { TradeGrid } from "@/components/home/TradeGrid";
import { ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const t = await getTranslations();
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  if (!home) {
    return (
      <ErrorPage>
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader
        title={t("lists.tradesTitle", { count: home.trades.length })}
        text={t("lists.tradesText")}
      />
      <TradeGrid
        trades={home.trades}
        about={Object.fromEntries(home.trades.map((trade) => [trade.code, t.has(`tradeAbout.${trade.code}` as "tradeAbout.plumber") ? t(`tradeAbout.${trade.code}` as "tradeAbout.plumber") : ""]))}
      />
    </div>
  );
}
