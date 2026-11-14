import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { JobsBoard } from "@/components/panels/JobsBoard";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const t = await getTranslations("jb");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <JobsBoard />
    </div>
  );
}
