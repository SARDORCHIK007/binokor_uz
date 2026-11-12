import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { ForeignPanel, type ForeignData } from "@/components/panels/ForeignPanel";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VacanciesPage() {
  const t = await getTranslations("fv");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<ForeignData>(`/api/v1/foreign/me?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <ForeignPanel initial={data} />
    </div>
  );
}
