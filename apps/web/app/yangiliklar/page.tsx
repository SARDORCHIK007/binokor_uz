import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { CARD_LINK, ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type NewsItem = { slug: string; title: string; published_at: string };

export default async function NewsPage() {
  const t = await getTranslations();
  const items = await apiGet<NewsItem[]>("/api/v1/public/news");
  if (!items) {
    return (
      <ErrorPage>
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader title={t("nav.news")} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.slug}>
            <Link href={`/yangiliklar/${item.slug}`} className={`${CARD_LINK} group flex h-full flex-col`}>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Icon name="calendar" className="size-4 text-primary" />
                <time dateTime={item.published_at}>{item.published_at}</time>
              </p>
              <h2 className="mt-3 flex-1 text-lg font-bold leading-snug text-navy-900 group-hover:text-primary">{item.title}</h2>
              <span className="mt-4 inline-flex size-9 items-center justify-center self-end rounded-full bg-blue-100 text-primary transition group-hover:bg-primary group-hover:text-white">
                <Icon name="arrow" className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
