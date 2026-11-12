import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { MahallaPanel, type MahallaData } from "@/components/panels/MahallaPanel";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MahallaPage() {
  const t = await getTranslations("mp");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<MahallaData>(`/api/v1/mahalla/overview?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <MahallaPanel initial={data} />
    </div>
  );
}
