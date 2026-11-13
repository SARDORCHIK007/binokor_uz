import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { ModerationQueue } from "@/components/panels/ModerationQueue";
import { ModerationTabs } from "@/components/panels/ModerationTabs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const t = await getTranslations("mod");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <ModerationTabs active="queue" />
      <ModerationQueue />
    </div>
  );
}
