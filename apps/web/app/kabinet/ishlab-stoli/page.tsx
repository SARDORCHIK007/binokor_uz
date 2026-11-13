import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { ProducerDesk } from "@/components/panels/ProducerDesk";

export const dynamic = "force-dynamic";

export default async function ProducerDeskPage() {
  const t = await getTranslations("pd");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <ProducerDesk />
    </div>
  );
}
