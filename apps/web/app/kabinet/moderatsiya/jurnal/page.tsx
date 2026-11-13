import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { AuditLog } from "@/components/panels/AuditLog";
import { ModerationTabs } from "@/components/panels/ModerationTabs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const t = await getTranslations("au");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={""} />
      <ModerationTabs active="audit" />
      <AuditLog />
    </div>
  );
}
