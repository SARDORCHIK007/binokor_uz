import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { GraduatesPanel, type GraduatesData } from "@/components/panels/GraduatesPanel";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GraduatesPage() {
  const t = await getTranslations("grad");
  const states = await getTranslations("states");
  const data = await apiAuth<GraduatesData>("/api/v1/graduates");
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <GraduatesPanel initial={data} />
    </div>
  );
}
