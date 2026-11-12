import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageHead } from "@/components/cabinet/kit";
import { StudentRatingTable, type StudentRow } from "@/components/monitoring/StudentRatingTable";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentRatingsPage() {
  const t = await getTranslations("mon");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const rows = await apiAuth<StudentRow[]>(`/api/v1/monitoring/students?lang=${locale}`);
  if (!rows) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={t("students.title")}
        text={t("students.text")}
        actions={
          <Link href="/kabinet/monitoring" className="text-sm font-bold text-primary hover:underline">
            ← {t("back")}
          </Link>
        }
      />
      <StudentRatingTable rows={rows} />
    </div>
  );
}
