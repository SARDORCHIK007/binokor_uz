import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon, type IconName } from "@/components/brand/Icon";
import { QrMark } from "@/components/QrMark";
import { CARD, ErrorPage, PAGE } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type PortfolioItem = { id: string; title: string; image: string | null; created_at: string };
type Reviews = {
  count: number;
  criteria: Record<"quality" | "discipline" | "safety" | "communication", number | null>;
  latest: { comment: string; date: string; employer: string; score: number | null }[];
};
type Worker = {
  name: string;
  trade: string;
  level: string;
  availability: string;
  rating: number | null;
  hours: number;
  certificate_number?: string | null;
  portfolio?: PortfolioItem[];
  reviews?: Reviews | null;
};

const CRITERIA = ["quality", "discipline", "safety", "communication"] as const;

export default async function WorkerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("worker");
  const nav = await getTranslations("nav");
  const states = await getTranslations("states");
  const worker = await apiGet<Worker>(`/api/v1/public/workers/${slug}`);
  if (!worker) {
    return (
      <ErrorPage>
        <EmptyState title={states("errorTitle")} text={states("errorText")} />
      </ErrorPage>
    );
  }
  const verifyPath = worker.certificate_number ? `/verify/${worker.certificate_number}` : "";
  const label = (key: string, fallback: string) => (t.has(key as "yes") ? t(key as "yes") : fallback);
  const rows: { icon: IconName; term: string; value: string }[] = [
    { icon: "briefcase", term: t("trade"), value: worker.trade },
    { icon: "clock", term: t("hours"), value: String(worker.hours) },
    { icon: "calendar", term: t("availability"), value: label(`status.${worker.availability}`, worker.availability) },
    { icon: "award", term: t("certificate"), value: worker.certificate_number ? t("yes") : t("no") },
  ];
  const portfolio = worker.portfolio ?? [];
  const reviews = worker.reviews;

  return (
    <article className={PAGE}>
      <nav aria-label="breadcrumb" className="mb-5 text-sm text-muted">
        <Link href="/" className="hover:text-primary">{nav("home")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <Link href="/ustalar" className="hover:text-primary">{t("crumb")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <span className="font-semibold text-navy-900">{worker.name}</span>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className={`${CARD} p-6`}>
          <div className="flex items-center gap-4">
            <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-blue-100 text-3xl font-extrabold text-primary ring-1 ring-blue-200" aria-hidden="true">
              {worker.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{worker.name}</h1>
              <p className="text-sm text-muted">{label(`level.${worker.level}`, worker.level)}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {worker.certificate_number ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-0.5 text-xs font-bold text-success-600">
                    <Icon name="check" className="size-3.5" /> {t("certified")}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold text-warning-600">
                  <Icon name="star" className="size-3.5" />
                  {worker.rating === null ? t("noRating") : `${worker.rating.toFixed(1)} / 5`}
                </span>
              </div>
            </div>
          </div>
          <dl className="mt-6 divide-y divide-line text-sm">
            {rows.map((row) => (
              <div key={row.term} className="flex items-center gap-3 py-3">
                <Icon name={row.icon} className="size-5 text-primary" />
                <dt className="text-muted">{row.term}</dt>
                <dd className="ml-auto font-semibold text-navy-900">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">{t("privacy")}</p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-card text-center shadow-sh1">
          <h2 className="bg-primary px-4 py-3 text-lg font-bold text-white">{t("passport")}</h2>
          <div className="p-5">
            <div className="flex justify-center">
              {verifyPath ? <QrMark value={`https://uychibinokor.uz${verifyPath}`} /> : <p className="py-10 text-sm text-muted">{t("noCertificate")}</p>}
            </div>
            {verifyPath ? (
              <Link href={verifyPath} className="mt-5 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-white hover:bg-primary-hover">
                {t("verify")}: {worker.certificate_number}
              </Link>
            ) : null}
          </div>
        </section>
      </div>

      {reviews ? (
        <section className={`${CARD} mt-5 p-6`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold text-navy-900">{t("reviews")}</h2>
            <span className="text-sm text-muted">{t("reviewsCount", { count: reviews.count })}</span>
          </div>
          {reviews.count === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noReviews")}</p>
          ) : (
            <div className="mt-4 grid gap-6 md:grid-cols-[1fr_1.2fr]">
              <ul className="flex flex-col gap-3">
                {CRITERIA.map((key) => {
                  const value = reviews.criteria[key] ?? 0;
                  return (
                    <li key={key}>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">{t(`crit.${key}`)}</span>
                        <span className="font-bold tabular-nums text-navy-900">{value.toFixed(1)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-100" role="img" aria-label={`${t(`crit.${key}`)} ${value.toFixed(1)} / 5`}>
                        <div className="h-full rounded-full bg-accent" style={{ width: `${(value / 5) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <ul className="flex flex-col gap-3">
                {reviews.latest.map((item) => (
                  <li key={`${item.date}-${item.employer}`} className="rounded-xl border border-line bg-canvas p-4">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-navy-900">{item.employer}</span>
                      <span className="inline-flex items-center gap-1 font-bold text-warning-600">
                        <Icon name="star" className="size-3.5" /> {item.score?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                    {item.comment ? <p className="mt-2 text-sm text-body">«{item.comment}»</p> : null}
                    <time dateTime={item.date} className="mt-2 block text-xs text-muted">{item.date}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      <section className={`${CARD} mt-5 p-6`}>
        <h2 className="text-xl font-bold text-navy-900">{t("portfolio")}</h2>
        {portfolio.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("noPortfolio")}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {portfolio.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-xl border border-line bg-canvas">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                ) : null}
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-navy-900">{item.title}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-success-600">
                    <Icon name="check" className="size-3" /> {t("confirmed")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
