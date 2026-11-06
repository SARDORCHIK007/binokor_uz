import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type NewsItem = { slug: string; title: string; published_at: string };

export default async function NewsPage() {
  const t = await getTranslations("states");
  const items = await apiGet<NewsItem[]>("/api/v1/public/news");
  if (!items) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">Yangiliklar</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`/yangiliklar/${item.slug}`} className="block rounded-md border border-line bg-card p-4">
              <p className="text-sm text-muted">{item.published_at}</p>
              <h2 className="mt-1 text-xl font-semibold">{item.title}</h2>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
