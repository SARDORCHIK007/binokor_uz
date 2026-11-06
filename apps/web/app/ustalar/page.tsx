import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
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
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  if (workers.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title="Ustalar yo'q" text="Hozircha ochiq profil yo'q." />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">Ustalar</h1>
      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Ism"
          className="min-h-11 rounded-sm border border-line px-3"
        />
        <input
          name="trade"
          defaultValue={query.trade ?? ""}
          placeholder="Kasb kodi, masalan plumber"
          className="min-h-11 rounded-sm border border-line px-3"
        />
        <button type="submit" className="min-h-11 rounded-sm bg-primary px-4 text-white">
          Qidirish
        </button>
      </form>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <li key={worker.slug}>
            <Link href={`/ustalar/${worker.slug}`} className="block rounded-md border border-line bg-card p-4 shadow-sh1">
              <h2 className="text-xl font-semibold">{worker.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {worker.trade} · {LEVEL[worker.level] ?? worker.level} · {AVAILABILITY[worker.availability] ?? worker.availability}
              </p>
              <p className="mt-2 text-sm tabular-nums">
                {worker.hours} soat · {worker.rating ?? "—"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
