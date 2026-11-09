import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
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

const LEVEL: Record<string, string> = {
  APPRENTICE: "Shogird",
  ASSISTANT: "Yordamchi",
  MASTER: "Usta",
  FOREMAN: "Brigadir",
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
                  {AVAILABILITY[worker.availability] ?? worker.availability}
                  {" · "}
                  {worker.trade}
                  {" · "}
                  {LEVEL[worker.level] ?? worker.level}
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
    </div>
  );
}
