import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { tradeImage } from "@/lib/media";
import { CARD, ErrorPage, FIELD, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Worker = {
  slug: string;
  name: string;
  trade: string;
  level: string;
  availability: string;
  rating: number | null;
  hours: number;
};

const AVATAR = [
  "bg-blue-100 text-primary",
  "bg-success-100 text-success-600",
  "bg-amber-100 text-warning-600",
  "bg-surface-100 text-navy-700",
];
const DOT: Record<string, string> = {
  FREE: "bg-success-600",
  BUSY: "bg-accent",
  ABROAD: "bg-primary",
  INACTIVE: "bg-faint",
};

type TradeCount = { code: string; name: string; domestic_months: number; workers: number };

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ trade?: string; q?: string }>;
}) {
  const t = await getTranslations("states");
  const l = await getTranslations("lists");
  const w = await getTranslations("worker");
  const query = await searchParams;
  const trades = await apiGet<TradeCount[]>("/api/v1/public/worker-trades");
  if (!trades) {
    return (
      <ErrorPage>
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </ErrorPage>
    );
  }

  // 1. No trade chosen: only trades are shown, never names.
  const chosen = trades.find((trade) => trade.code === query.trade);
  if (!chosen) {
    return (
      <div className={PAGE}>
        <PageHeader title={l("workersPick")} text={l("workersPickText")} />
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trades.map((trade) => (
            <li key={trade.code} className="min-w-0">
              <Link
                href={`/ustalar?trade=${trade.code}`}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-card p-3 pr-4 shadow-sh1 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sh2"
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-blue-50 ring-1 ring-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tradeImage(trade.code)} alt="" className="size-full object-cover object-top" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-navy-900 group-hover:text-primary">{trade.name}</span>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                      trade.workers > 0 ? "bg-success-100 text-success-600" : "bg-surface-100 text-muted"
                    }`}
                  >
                    <Icon name="users" className="size-3.5" />
                    {l("workersCount", { count: trade.workers })}
                  </span>
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon name="arrow" className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 2. Inside a trade: names appear here, with a search limited to this trade.
  const params = new URLSearchParams({ trade: chosen.code });
  if (query.q) {
    params.set("q", query.q);
  }
  const workers = await apiGet<Worker[]>(`/api/v1/public/workers?${params.toString()}`);
  if (!workers) {
    return (
      <ErrorPage>
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader title={l("workersIn", { trade: chosen.name })} />
      <Link href="/ustalar" className="-mt-4 mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
        ← {l("allTrades")}
      </Link>
      <form className={`${CARD} mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto]`} method="get">
        <input type="hidden" name="trade" value={chosen.code} />
        <input name="q" defaultValue={query.q ?? ""} placeholder={l("nameInTrade")} aria-label={l("nameInTrade")} className={FIELD} />
        <button type="submit" className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover">
          {l("search")}
        </button>
      </form>
      {workers.length === 0 ? (
        <EmptyState title={l("workersEmpty")} text={l("workersEmptyText")} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {workers.map((worker, index) => (
          <li key={worker.slug} className="min-w-0">
            <Link
              href={`/ustalar/${worker.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-card p-3 pr-4 shadow-sh1 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sh2"
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold ${AVATAR[index % AVATAR.length]}`}
                aria-hidden="true"
              >
                {worker.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-navy-900 group-hover:text-primary">{worker.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${DOT[worker.availability] ?? "bg-faint"}`} aria-hidden="true" />
                  {w.has(`status.${worker.availability}` as "status.FREE") ? w(`status.${worker.availability}` as "status.FREE") : worker.availability}
                  {" · "}
                  {worker.trade}
                  {" · "}
                  {w.has(`level.${worker.level}` as "level.MASTER") ? w(`level.${worker.level}` as "level.MASTER") : worker.level}
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold tabular-nums text-muted sm:inline-flex">
                <Icon name="clock" className="size-3.5" />
                {worker.hours}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold tabular-nums text-warning-600">
                <Icon name="star" className="size-3.5" />
                {worker.rating ?? "—"}
              </span>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-primary transition group-hover:bg-primary group-hover:text-white">
                <Icon name="arrow" className="size-4" />
              </span>
            </Link>
          </li>
        ))}
        </ul>
      )}
    </div>
  );
}
