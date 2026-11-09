import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CARD, ErrorPage, PAGE } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function NewsItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations();
  const item = await apiGet<{ title: string; body: string; published_at: string }>(
    `/api/v1/public/news/${slug}`,
  );
  if (!item) {
    return (
      <ErrorPage>
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </ErrorPage>
    );
  }
  return (
    <article className={PAGE}>
      <nav aria-label="breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">{t("nav.home")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <Link href="/yangiliklar" className="hover:text-primary">{t("nav.news")}</Link>
      </nav>
      <div className={`${CARD} mt-6 max-w-3xl p-6 sm:p-10`}>
        <time dateTime={item.published_at} className="text-sm font-semibold text-primary">{item.published_at}</time>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{item.title}</h1>
        <p className="mt-6 text-lg leading-relaxed whitespace-pre-line text-body">{item.body}</p>
      </div>
    </article>
  );
}
