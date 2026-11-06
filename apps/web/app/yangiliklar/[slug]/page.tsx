import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function NewsItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("states");
  const item = await apiGet<{ title: string; body: string; published_at: string }>(
    `/api/v1/public/news/${slug}`,
  );
  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted">{item.published_at}</p>
      <h1 className="mt-2 text-4xl font-semibold text-navy-900">{item.title}</h1>
      <p className="mt-4 text-lg">{item.body}</p>
    </article>
  );
}
