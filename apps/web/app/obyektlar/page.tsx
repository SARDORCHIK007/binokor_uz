import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { SiteMap } from "@/components/objects/SiteMap";
import { Icon } from "@/components/brand/Icon";
import { CARD, ErrorPage, FilterTabs, PAGE, PageHeader } from "@/components/site/PageHeader";
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


export default async function ObjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const t = await getTranslations("states");
  const l = await getTranslations("lists");
  const query = await searchParams;
  const suffix = query.status ? `?status=${encodeURIComponent(query.status)}` : "";
  const objects = await apiGet<Site[]>(`/api/v1/public/objects${suffix}`);
  if (!objects) {
    return (
      <ErrorPage>
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader title={l("objects")} />
      <FilterTabs
        items={[
          { href: "/obyektlar", label: l("all"), active: !query.status },
          { href: "/obyektlar?status=IN_PROGRESS", label: l("obj.IN_PROGRESS"), active: query.status === "IN_PROGRESS" },
          { href: "/obyektlar?status=COMPLETED", label: l("obj.COMPLETED"), active: query.status === "COMPLETED" },
        ]}
      />
      <SiteMap sites={objects} />
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {objects.map((item) => (
          <li key={item.id} className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-navy-900">{item.name}</h2>
              <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-primary">
                {l.has(`obj.${item.status}` as "obj.PLANNED") ? l(`obj.${item.status}` as "obj.PLANNED") : item.status}
              </span>
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
              <Icon name="pin" className="size-4 shrink-0" />
              {item.address}
            </p>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold text-muted">
                <span>{item.lat.toFixed(3)}, {item.lon.toFixed(3)}</span>
                <span className="tabular-nums text-navy-900">{item.progress}%</span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-100"
                role="progressbar"
                aria-valuenow={item.progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
