import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CERT_PATTERN } from "@/lib/demo";
import { CARD, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toUpperCase();
  if (CERT_PATTERN.test(query)) {
    redirect(`/verify/${query}`);
  }
  const t = await getTranslations("search");
  const hits = await apiGet<{ kind: string; ref: string; title: string }[]>(
    `/api/v1/public/search?q=${encodeURIComponent(q)}`,
  );
  return (
    <div className={PAGE}>
      <PageHeader title={t("title")} text={q ? `«${q}»` : undefined} />
      {hits && hits.length > 0 ? (
        <ul className="grid max-w-3xl gap-3">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.ref}`} className={CARD}>
              <p className="text-xs font-bold tracking-wider text-primary uppercase">{hit.kind}</p>
              <p className="mt-1 text-lg font-bold text-navy-900">{hit.title}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="max-w-xl">
        <EmptyState
        title={t("emptyTitle")}
        text={t("emptyText")}
        action={
          <Link href="/" className={buttonClass({ variant: "secondary" })}>
            {t("back")}
          </Link>
        }
      />
        </div>
      )}
    </div>
  );
}
