import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { TradeGrid } from "@/components/home/TradeGrid";
import { ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

const about: Record<string, string> = {
  bricklayer: "Devor va fasad terimi. Ichki va tashqi bozorda barqaror talab.",
  carpenter: "Yog'och konstruksiya, eshik va deraza. Ustaxona va obyekt.",
  concrete: "Beton quyish va parvarish. Obyektda amaliy soatlar.",
  drafting: "Chizma o'qish va oddiy loyiha hujjati.",
  electrician: "Ichki elektr tarmog'i. Xavfsizlik qoidalari majburiy.",
  painter: "Ichki va tashqi bo'yoq. Yuzani tayyorlash.",
  plasterer: "Suvoq va tekislash. Ichki pardozning asosi.",
  plumber: "Suv va oqova tizimi. Eng ko'p so'raladigan kasblardan.",
  rebar: "Armatura yig'ish. Beton ishlariga bog'langan.",
  roofer: "Tom yopish va gidroizolyatsiya.",
  tiler: "Pol va devor plitkasi. Pardoz brigadasi uchun.",
  welder: "Metall biriktirish. Sertifikat va xavfsizlik birga.",
};

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
        title={`${home.trades.length} ta ustalik kasbi`}
        text="Ichki va xorijiy mehnat bozori uchun eng talabgir qurilish kasblari"
      />
      <TradeGrid trades={home.trades} about={about} />
    </div>
  );
}
