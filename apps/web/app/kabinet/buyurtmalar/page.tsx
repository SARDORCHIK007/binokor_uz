import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { OrderStatusButton } from "@/components/cabinet/OrderStatusButton";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Order = {
  id: string;
  buyer_name: string;
  quantity: number;
  status: string;
  product: string;
};

const STATUS: Record<string, string> = {
  NEW: "Yangi",
  CONTACTED: "Bog'lanildi",
  DONE: "Bajarildi",
  CANCELLED: "Bekor",
};

export default async function OrdersPage() {
  const t = await getTranslations("states");
  const rows = await apiAuth<Order[]>("/api/v1/admin/orders");
  if (!rows) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }
  if (rows.length === 0) {
    return <EmptyState title="Buyurtma yo'q" text="Hali material buyurtmasi tushmagan." />;
  }
  return (
    <div className="p-4">
      <h1 className="text-3xl font-extrabold text-[#071833]">Material buyurtmalari</h1>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((item) => (
          <li key={item.id} className="rounded-[20px] border border-[#e5eaf2] bg-white shadow-sm p-3">
            <p className="font-semibold">
              {item.product} · {item.quantity}
            </p>
            <p className="text-sm text-muted">
              {item.buyer_name} · {STATUS[item.status] ?? item.status}
            </p>
            {item.status === "NEW" ? (
              <div className="mt-2">
                <OrderStatusButton id={item.id} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
