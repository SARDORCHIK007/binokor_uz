import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { GraduateOutcomes } from "@/components/panels/GraduateOutcomes";

export const dynamic = "force-dynamic";

export default async function GraduateOutcomesPage() {
  const t = await getTranslations("go");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <GraduateOutcomes />
    </div>
  );
}
