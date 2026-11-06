import { EmptyState, StatusBadge } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { OrderForm } from "@/components/materials/OrderForm";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  unit: string;
  price: string | null;
  in_stock: boolean;
  producer: string;
  category: string;
  category_name: string;
  stale: boolean;
};

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const t = await getTranslations("states");
  const query = await searchParams;
  const suffix = query.category ? `?category=${encodeURIComponent(query.category)}` : "";
  const products = await apiGet<Product[]>(`/api/v1/public/products${suffix}`);
  if (!products) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">Materiallar</h1>
      <div className="mt-4 flex gap-3 text-sm">
        <a href="/materiallar" className="text-primary">
          Hammasi
        </a>
        <a href="/materiallar?category=plumbing" className="text-primary">
          Sement va g'isht
        </a>
        <a href="/materiallar?category=general" className="text-primary">
          Umumiy
        </a>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((item) => (
          <li key={item.id} className="rounded-md border border-line bg-card p-4">
            <h2 className="text-lg font-semibold">{item.name}</h2>
            <p className="mt-1 text-sm text-muted">{item.producer}</p>
            <p className="mt-2 tabular-nums">{item.price} so'm / {item.unit}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone={item.in_stock ? "success" : "warning"}>
                {item.in_stock ? "Omborda bor" : "Omborda yo'q"}
              </StatusBadge>
              {item.stale ? <StatusBadge tone="warning">Narx eskirgan bo'lishi mumkin</StatusBadge> : null}
            </div>
            {item.in_stock ? <OrderForm productId={item.id} name={item.name} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
