import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { LeadershipDesk } from "@/components/panels/LeadershipDesk";

export const dynamic = "force-dynamic";

export default async function LeadershipPage() {
  const t = await getTranslations("ld");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <LeadershipDesk />
    </div>
  );
}
