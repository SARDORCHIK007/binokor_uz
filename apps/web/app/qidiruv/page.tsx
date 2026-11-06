import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CERT_PATTERN } from "@/lib/demo";
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
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">{t("title")}</h1>
      {hits && hits.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.ref}`} className="rounded-md border border-line bg-card p-4">
              <p className="text-sm text-muted">{hit.kind}</p>
              <p className="font-semibold">{hit.title}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
        title={t("emptyTitle")}
        text={t("emptyText")}
        action={
          <Link href="/" className={buttonClass({ variant: "secondary" })}>
            {t("back")}
          </Link>
        }
      />
      )}
    </div>
  );
}
