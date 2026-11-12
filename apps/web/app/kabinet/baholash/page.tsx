import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { SurveyForm, type SurveyData } from "@/components/monitoring/SurveyForm";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const t = await getTranslations("sv");
  const states = await getTranslations("states");
  const data = await apiAuth<SurveyData>("/api/v1/me/teacher-survey");
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <SurveyForm initial={data} />
    </div>
  );
}
