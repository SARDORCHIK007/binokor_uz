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

export default async function WorkersPage() {
  const t = await getTranslations("states");
  const workers = await apiGet<Worker[]>("/api/v1/public/workers");
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
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workers.map((worker) => (
          <li key={worker.slug}>
            <Link href={`/ustalar/${worker.slug}`} className="block rounded-md border border-line bg-card p-4 shadow-sh1">
              <h2 className="text-xl font-semibold">{worker.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {worker.trade} · {worker.level}
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
