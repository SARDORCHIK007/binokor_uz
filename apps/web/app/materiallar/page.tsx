import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { ProductTile } from "@/components/materials/ProductTile";
import { ErrorPage, FilterTabs, PAGE, PageHeader } from "@/components/site/PageHeader";
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
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {products.map((item) => (
          <li key={item.id}>
            <ProductTile item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
