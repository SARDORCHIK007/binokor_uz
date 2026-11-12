import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageHead } from "@/components/cabinet/kit";
import type { CandidatePool } from "@/components/panels/CandidatePool";
import { VacancyDesk, type DeskData } from "@/components/panels/VacancyDesk";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VacancyDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("ag");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const [desk, pool] = await Promise.all([
    apiAuth<DeskData>(`/api/v1/migration/vacancies/${id}?lang=${locale}`),
    apiAuth<Parameters<typeof CandidatePool>[0]["initial"]>(`/api/v1/migration/pool?lang=${locale}&vacancy=${id}`),
  ]);
  if (!desk || !pool) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={t("desk.title")}
        text={desk.vacancy.employer}
        actions={
          <Link href="/kabinet/migratsiya" className="text-sm font-bold text-primary hover:underline">
            ← {t("back")}
          </Link>
        }
      />
      <VacancyDesk initial={desk} pool={pool} />
    </div>
  );
}
