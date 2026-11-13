import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { EmploymentTabs } from "@/components/panels/EmploymentTabs";
import { PaymentsPanel, type PaymentsOverview } from "@/components/panels/PaymentsPanel";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const t = await getTranslations("pay");
  const states = await getTranslations("states");
  const data = await apiAuth<PaymentsOverview>("/api/v1/payments/overview");
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <EmploymentTabs active="payments" />
      <PaymentsPanel initial={data} />
    </div>
  );
}
