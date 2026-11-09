import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/brand/Icon";
import { CARD, ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
  const t = await getTranslations();
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  if (!home) {
    return (
      <ErrorPage>
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </ErrorPage>
    );
  }
  return (
    <div className={PAGE}>
      <PageHeader title={t("home.destinationsTitle")} text={t("home.destinationsText")} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {home.destinations.map((item) => (
          <li key={item.code} className={CARD}>
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-primary">
                <Icon name="globe" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-navy-900">{item.name}</h2>
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">{item.language}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{item.notes}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
