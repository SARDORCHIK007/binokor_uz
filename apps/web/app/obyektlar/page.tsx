import { EmptyState, StatusBadge } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
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

export default async function ObjectsPage() {
  const t = await getTranslations("states");
  const objects = await apiGet<Site[]>("/api/v1/public/objects");
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
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {objects.map((item) => (
          <li key={item.id} className="rounded-md border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">{item.name}</h2>
              <StatusBadge tone="info">{item.progress}%</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-muted">{item.address}</p>
            <p className="mt-1 text-sm tabular-nums text-muted">
              {item.lat.toFixed(3)}, {item.lon.toFixed(3)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
