import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { CARD, CARD_LINK, ErrorPage, FIELD, PAGE, PageHeader } from "@/components/site/PageHeader";
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

const LEVEL: Record<string, string> = {
  APPRENTICE: "Shogird",
  ASSISTANT: "Yordamchi",
  MASTER: "Usta",
  FOREMAN: "Brigadir",
};
const DOT: Record<string, string> = {
  FREE: "bg-success-600",
  BUSY: "bg-accent",
  ABROAD: "bg-primary",
  INACTIVE: "bg-faint",
};
const AVAILABILITY: Record<string, string> = {
  FREE: "Bo'sh",
  BUSY: "Band",
  ABROAD: "Xorijda",
  INACTIVE: "Nofaol",
};

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ trade?: string; q?: string }>;
}) {
  const t = await getTranslations("states");
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.trade) {
    params.set("trade", query.trade);
  }
  if (query.q) {
    params.set("q", query.q);
  }
  const suffix = params.size ? `?${params.toString()}` : "";
  const workers = await apiGet<Worker[]>(`/api/v1/public/workers${suffix}`);
  if (!workers) {
    return (
      <ErrorPage>
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </ErrorPage>
    );
  }
  if (workers.length === 0) {
    return (
      <ErrorPage>
        <EmptyState title="Ustalar yo'q" text="Hozircha ochiq profil yo'q." />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader title="Ustalar" />
      <form className={`${CARD} mb-6 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]`} method="get">
        <input name="q" defaultValue={query.q ?? ""} placeholder="Ism" aria-label="Ism" className={FIELD} />
        <input
          name="trade"
          defaultValue={query.trade ?? ""}
          placeholder="Kasb kodi, masalan plumber"
          aria-label="Kasb kodi"
          className={FIELD}
        />
        <button type="submit" className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover">
          Qidirish
        </button>
      </form>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <li key={worker.slug}>
            <Link href={`/ustalar/${worker.slug}`} className={`${CARD_LINK} group`}>
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-navy-900 text-base font-bold text-white">
                  {worker.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-navy-900 group-hover:text-primary">{worker.name}</h2>
                  <p className="truncate text-sm text-muted">{worker.trade}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-primary">{LEVEL[worker.level] ?? worker.level}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-navy-900">
                  <span className={`size-2 rounded-full ${DOT[worker.availability] ?? "bg-faint"}`} aria-hidden="true" />
                  {AVAILABILITY[worker.availability] ?? worker.availability}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm tabular-nums text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="clock" className="size-4" />
                  {worker.hours} soat
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-navy-900">
                  <Icon name="star" className="size-4 text-accent" />
                  {worker.rating ?? "—"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
