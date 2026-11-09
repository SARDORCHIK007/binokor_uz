import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { TradeGrid } from "@/components/home/TradeGrid";
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
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#F4F7FB] py-10">
      <div className="mx-auto max-w-[1200px] px-4">
        <nav aria-label="Yo'l" className="text-sm text-[#5f6b7d]">
          <Link href="/" className="hover:text-[#2F6BFF]">Bosh sahifa</Link>
          <span className="mx-2 text-[#98a2b3]" aria-hidden="true">›</span>
          <span className="font-semibold text-[#071833]">Kasblar</span>
        </nav>
        <div className="mt-6">
          <div>
            <h1 className="text-3xl font-extrabold text-[#071833] sm:text-4xl">{home.trades.length} ta ustalik kasbi</h1>
            <p className="mt-2 text-sm text-[#5f6b7d] sm:text-base">Ichki va xorijiy mehnat bozori uchun eng talabgir qurilish kasblari</p>
          </div>
        </div>
        <TradeGrid trades={home.trades} about={about} />
      </div>
    </div>
  );
}
