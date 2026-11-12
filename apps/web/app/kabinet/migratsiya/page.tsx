import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { MigrationPanel, type MigrationData } from "@/components/panels/MigrationPanel";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MigrationPage() {
  const t = await getTranslations("mg");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<MigrationData>(`/api/v1/migration/overview?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={data.can_manage ? t("textAgency") : t("textObserver")} />
      <MigrationPanel initial={data} />
    </div>
  );
}
