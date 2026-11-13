import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { PersonCard, type CardData } from "@/components/people/PersonCard";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("pc");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<CardData>(`/api/v1/people/${id}?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <PersonCard initial={data} />
    </div>
  );
}
