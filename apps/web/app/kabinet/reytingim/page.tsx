import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { TeacherDetail, type TeacherDetailData } from "@/components/monitoring/TeacherDetail";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MyRatingPage() {
  const t = await getTranslations("mon");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<TeacherDetailData>(`/api/v1/me/teacher-rating?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("mine.title")} text={t("mine.text")} />
      <TeacherDetail data={data} />
    </div>
  );
}
