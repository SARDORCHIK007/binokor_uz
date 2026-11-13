import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { EmployerDesk } from "@/components/panels/EmployerDesk";

export const dynamic = "force-dynamic";

export default async function DeskPage() {
  const t = await getTranslations("ed");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <EmployerDesk />
    </div>
  );
}
