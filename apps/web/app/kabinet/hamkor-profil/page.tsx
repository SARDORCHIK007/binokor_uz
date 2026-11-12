import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { PartnerProfileEditor, type OwnProfile } from "@/components/panels/PartnerProfileEditor";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PartnerProfilePage() {
  const t = await getTranslations("pe");
  const profiles = await apiAuth<OwnProfile[]>("/api/v1/partner/profiles");
  if (!profiles) {
    return (
      <div className="flex flex-col gap-6">
        <PageHead title={t("title")} />
        <EmptyState title={t("title")} text={t("noPartner")} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <PartnerProfileEditor initial={profiles} />
    </div>
  );
}
