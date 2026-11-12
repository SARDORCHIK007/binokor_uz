import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { InvitationsPanel, type InvitationsData } from "@/components/panels/InvitationsPanel";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InvitationsPage() {
  const t = await getTranslations("inv");
  const states = await getTranslations("states");
  const [options, invitations, requests] = await Promise.all([
    apiAuth<InvitationsData["options"]>("/api/v1/admin/onboarding-options"),
    apiAuth<InvitationsData["invitations"]>("/api/v1/admin/invitations"),
    apiAuth<InvitationsData["requests"]>("/api/v1/admin/partner-requests"),
  ]);
  if (!options || !invitations || !requests) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <InvitationsPanel initial={{ options, invitations, requests }} />
    </div>
  );
}
