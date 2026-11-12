import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { EmploymentTabs } from "@/components/panels/EmploymentTabs";
import { EmploymentPanel, type EmploymentData } from "@/components/panels/EmploymentPanel";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EmploymentPage() {
  const t = await getTranslations("ep");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<EmploymentData>(`/api/v1/employment/overview?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <EmploymentTabs active="overview" />
      <EmploymentPanel initial={data} />
    </div>
  );
}
