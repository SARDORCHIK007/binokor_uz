import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { ProducerProfile } from "@/components/panels/ProducerProfile";

export const dynamic = "force-dynamic";

export default async function ProducerProfilePage() {
  const t = await getTranslations("pp");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <ProducerProfile />
    </div>
  );
}
