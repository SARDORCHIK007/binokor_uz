import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { AccountsPanel } from "@/components/panels/AccountsPanel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const t = await getTranslations("ac");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <AccountsPanel />
    </div>
  );
}
