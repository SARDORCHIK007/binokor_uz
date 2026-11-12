import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { FirmsPanel } from "@/components/panels/FirmsPanel";
import type { MigrationData } from "@/components/panels/MigrationPanel";
import { MigrationTabs } from "@/components/panels/MigrationTabs";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FirmsPage() {
  const t = await getTranslations("ag");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const [firms, overview] = await Promise.all([
    apiAuth<Parameters<typeof FirmsPanel>[0]["initial"]>("/api/v1/vacancies/firms"),
    apiAuth<MigrationData>(`/api/v1/migration/overview?lang=${locale}`),
  ]);
  if (!firms || !overview) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("firms.title")} text={t("firms.text")} />
      {overview.can_manage ? <MigrationTabs active="firms" /> : null}
      <FirmsPanel initial={firms} canManage={overview.can_manage} />
    </div>
  );
}
