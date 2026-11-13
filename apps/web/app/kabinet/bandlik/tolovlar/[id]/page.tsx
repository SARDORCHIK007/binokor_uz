import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageHead } from "@/components/cabinet/kit";
import { BatchDesk, type BatchData } from "@/components/panels/BatchDesk";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("pay");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<BatchData>(`/api/v1/payments/batches/${id}?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={t("title")}
        actions={
          <Link href="/kabinet/bandlik/tolovlar" className="text-sm font-bold text-primary hover:underline">
            ← {t("desk.back")}
          </Link>
        }
      />
      <BatchDesk initial={data} />
    </div>
  );
}
