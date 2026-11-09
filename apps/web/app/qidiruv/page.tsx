import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/brand/Icon";
import { CARD, ErrorPage, FIELD, PAGE, PageHeader } from "@/components/site/PageHeader";
import { CERT_PATTERN } from "@/lib/demo";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Kind = "trade" | "worker" | "product" | "object";
type Hit = { kind: Kind; ref: string; title: string; subtitle: string; href: string };

const ORDER: Kind[] = ["trade", "worker", "product", "object"];
const ICON: Record<Kind, IconName> = { trade: "briefcase", worker: "user", product: "box", object: "pin" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  if (CERT_PATTERN.test(query.toUpperCase())) {
    redirect(`/verify/${query.toUpperCase()}`);
  }
  const t = await getTranslations("search");
  const states = await getTranslations("states");
  const hits = query.length >= 2 ? await apiGet<Hit[]>(`/api/v1/public/search?q=${encodeURIComponent(query)}`) : [];

  const form = (
    <form method="get" role="search" className={`${CARD} mb-6 flex gap-2 p-3`}>
      <label htmlFor="search-q" className="sr-only">
        {t("title")}
      </label>
      <input id="search-q" name="q" defaultValue={query} placeholder={t("placeholder")} className={FIELD} autoFocus />
      <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover">
        {t("action")}
      </button>
    </form>
  );

  if (hits === null) {
    return (
      <ErrorPage>
        <EmptyState title={states("errorTitle")} text={states("errorText")} />
      </ErrorPage>
    );
  }

  return (
    <div className={PAGE}>
      <PageHeader
        title={t("title")}
        text={query.length >= 2 ? t("count", { count: hits.length }) : t("hint")}
      />
      <div className="max-w-3xl">
        {form}
        {query.length >= 2 && hits.length === 0 ? (
          <EmptyState
            title={t("emptyTitle")}
            text={t("emptyText")}
            action={
              <Link href="/" className={buttonClass({ variant: "secondary" })}>
                {t("back")}
              </Link>
            }
          />
        ) : null}
        {ORDER.map((kind) => {
          const group = hits.filter((hit) => hit.kind === kind);
          if (group.length === 0) {
            return null;
          }
          return (
            <section key={kind} className="mb-6">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-muted uppercase">
                {t(`kind.${kind}`)}
                <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] text-navy-900">{group.length}</span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-sh1">
                {group.map((hit) => (
                  <li key={`${hit.kind}-${hit.ref}`}>
                    <Link href={hit.href} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-canvas">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary">
                        <Icon name={ICON[kind]} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-navy-900 group-hover:text-primary">{hit.title}</span>
                        {hit.subtitle ? <span className="block truncate text-xs text-muted">{hit.subtitle}</span> : null}
                      </span>
                      <Icon name="arrow" className="size-4 shrink-0 text-faint group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
