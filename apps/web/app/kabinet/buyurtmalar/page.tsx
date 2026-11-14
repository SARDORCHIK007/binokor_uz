import { getTranslations } from "next-intl/server";
import { PageHead } from "@/components/cabinet/kit";
import { OrdersBoard } from "@/components/panels/OrdersBoard";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const t = await getTranslations("ob");
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("text")} />
      <OrdersBoard />
    </div>
  );
}
