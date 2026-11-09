import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/brand/Icon";
import { CARD, ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Brigade = { id: string; name: string; trade: string; status: string; members: number };

export default async function BrigadesPage() {
  const t = await getTranslations("states");
  const l = await getTranslations("lists");
  const rows = await apiGet<Brigade[]>("/api/v1/public/brigades");
  if (!rows) {
    return (
      <ErrorPage>
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </ErrorPage>
    );
  }
  if (rows.length === 0) {
    return (
      <ErrorPage>
        <EmptyState title={l("brigadesEmpty")} text={l("brigadesEmptyText")} />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader title={l("brigades")} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((item) => (
          <li key={item.id} className={CARD}>
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary">
                <Icon name="users" className="size-5" />
              </span>
              <h2 className="text-lg font-bold text-navy-900">{item.name}</h2>
            </div>
            <p className="mt-4 text-sm text-muted">
              {item.trade} · {l("members", { count: item.members })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
