import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { DistrictPlan } from "@/components/panels/DistrictPlan";

export const dynamic = "force-dynamic";

export default async function DistrictPlanPage() {
  const t = await getTranslations("dp");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <DistrictPlan />
    </div>
  );
}
