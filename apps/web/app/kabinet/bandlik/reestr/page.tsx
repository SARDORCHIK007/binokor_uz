import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { EmploymentTabs } from "@/components/panels/EmploymentTabs";
import { ProjectRegistry, type RegistryData } from "@/components/panels/ProjectRegistry";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegistryPage() {
  const t = await getTranslations("reg");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const [data, options] = await Promise.all([
    apiAuth<RegistryData>(`/api/v1/employment/people?lang=${locale}`),
    apiAuth<{ employers: { id: string; name: string }[] }>("/api/v1/employment/options"),
  ]);
  if (!data || !options) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <EmploymentTabs active="registry" />
      <ProjectRegistry initial={data} options={options} />
    </div>
  );
}
