import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { EmploymentTabs } from "@/components/panels/EmploymentTabs";
import { IntakeForms } from "@/components/panels/IntakeForms";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const t = await getTranslations("ep");
  const states = await getTranslations("states");
  const [options, mine] = await Promise.all([
    apiAuth<{ mahallas: { id: string; name: string }[]; trades: { code: string; name: string }[] }>("/api/v1/employment/options"),
    apiAuth<{ id: string; org_name: string; kind: string; status: string; created: string }[]>("/api/v1/employment/partners"),
  ]);
  if (!options || !mine) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("tab.add")} />
      <EmploymentTabs active="add" />
      <IntakeForms options={options} initialMine={mine} />
    </div>
  );
}
