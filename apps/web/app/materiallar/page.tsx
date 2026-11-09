import { EmptyState, StatusBadge } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { OrderForm } from "@/components/materials/OrderForm";
import { CARD, ErrorPage, FilterTabs, PAGE, PageHeader } from "@/components/site/PageHeader";
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
      <ErrorPage>
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader title="Materiallar" />
      <FilterTabs
        items={[
          { href: "/materiallar", label: "Hammasi", active: !query.category },
          { href: "/materiallar?category=plumbing", label: "Sement va g'isht", active: query.category === "plumbing" },
          { href: "/materiallar?category=general", label: "Umumiy", active: query.category === "general" },
        ]}
      />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((item) => (
          <li key={item.id} className={`${CARD} flex flex-col`}>
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">{item.producer}</p>
            <h2 className="mt-1 text-lg font-bold text-navy-900">{item.name}</h2>
            <p className="mt-3 text-2xl font-extrabold tabular-nums text-navy-900">
              {item.price === null ? "—" : Math.round(Number(item.price)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              <span className="text-sm font-semibold text-muted">so&apos;m / {item.unit}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone={item.in_stock ? "success" : "warning"}>
                {item.in_stock ? "Omborda bor" : "Omborda yo'q"}
              </StatusBadge>
              {item.stale ? <StatusBadge tone="warning">Narx eskirgan bo&apos;lishi mumkin</StatusBadge> : null}
            </div>
            <div className="mt-auto pt-4">{item.in_stock ? <OrderForm productId={item.id} name={item.name} /> : null}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
