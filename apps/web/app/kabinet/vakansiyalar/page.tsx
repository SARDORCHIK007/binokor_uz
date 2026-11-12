import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { VacancyWorkspace, type WorkspaceData } from "@/components/panels/VacancyWorkspace";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VacanciesPage() {
  const t = await getTranslations("vw");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<WorkspaceData>(`/api/v1/vacancies/me?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <VacancyWorkspace initial={data} />
    </div>
  );
}
