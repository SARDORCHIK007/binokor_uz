import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { CandidatePool } from "@/components/panels/CandidatePool";
import type { MigrationData } from "@/components/panels/MigrationPanel";
import { MigrationTabs } from "@/components/panels/MigrationTabs";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PoolPage() {
  const t = await getTranslations("ag");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const [pool, overview] = await Promise.all([
    apiAuth<Parameters<typeof CandidatePool>[0]["initial"]>(`/api/v1/migration/pool?lang=${locale}`),
    apiAuth<MigrationData>(`/api/v1/migration/overview?lang=${locale}`),
  ]);
  if (!pool || !overview) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const open = overview.vacancies
    .filter((item) => !["CLOSED", "CANCELLED", "MATCHED"].includes(item.status))
    .map((item) => ({ id: item.id, label: `${item.trade} · ${item.employer} (${item.country})` }));
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("pool.title")} text={t("pool.text")} />
      <MigrationTabs active="pool" />
      <CandidatePool initial={pool} openVacancies={open} />
    </div>
  );
}
