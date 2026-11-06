import { EmptyState, StatusBadge } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { SiteMap } from "@/components/objects/SiteMap";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Site = {
  id: string;
  name: string;
  address: string;
  status: string;
  progress: number;
  lat: number;
  lon: number;
};

const OBJECT_STATUS: Record<string, string> = {
  PLANNED: "Rejada",
  IN_PROGRESS: "Jarayonda",
  COMPLETED: "Tugagan",
  PAUSED: "To'xtagan",
};

export default async function ObjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const t = await getTranslations("states");
  const query = await searchParams;
  const suffix = query.status ? `?status=${encodeURIComponent(query.status)}` : "";
  const objects = await apiGet<Site[]>(`/api/v1/public/objects${suffix}`);
  if (!objects) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">Obyektlar</h1>
      <div className="mt-4 flex gap-3 text-sm">
        <a href="/obyektlar" className="text-primary">
          Hammasi
        </a>
        <a href="/obyektlar?status=IN_PROGRESS" className="text-primary">
          Jarayonda
        </a>
        <a href="/obyektlar?status=COMPLETED" className="text-primary">
          Tugagan
        </a>
      </div>
      <div className="mt-6">
        <SiteMap sites={objects} />
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {objects.map((item) => (
          <li key={item.id} className="rounded-md border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <StatusBadge tone="info">{item.progress}%</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-muted">
              {item.address} · {OBJECT_STATUS[item.status] ?? item.status}
            </p>
            <p className="mt-1 text-sm tabular-nums text-muted">
              {item.lat.toFixed(3)}, {item.lon.toFixed(3)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
