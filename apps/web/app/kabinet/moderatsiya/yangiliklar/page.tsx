import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { NewsEditor } from "@/components/panels/NewsEditor";
import { ModerationTabs } from "@/components/panels/ModerationTabs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const t = await getTranslations("news");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={""} />
      <ModerationTabs active="news" />
      <NewsEditor />
    </div>
  );
}
