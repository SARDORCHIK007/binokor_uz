import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { CompanyProfile } from "@/components/panels/CompanyProfile";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const t = await getTranslations("ed");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("pf.title")} text={t("pf.text")} />
      <CompanyProfile />
    </div>
  );
}
