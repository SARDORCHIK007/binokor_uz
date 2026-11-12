import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageHead } from "@/components/cabinet/kit";
import { TeacherDetail, type TeacherDetailData } from "@/components/monitoring/TeacherDetail";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("mon");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<TeacherDetailData>(`/api/v1/monitoring/teachers/${id}?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={data.name}
        text={t("t.title")}
        actions={
          <Link href="/kabinet/monitoring" className="text-sm font-bold text-primary hover:underline">
            ← {t("back")}
          </Link>
        }
      />
      <TeacherDetail data={data} />
    </div>
  );
}
