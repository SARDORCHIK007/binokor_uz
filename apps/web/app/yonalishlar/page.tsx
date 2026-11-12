import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { Flag } from "@/components/Flag";
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
              <Flag code={item.code} className="size-11" />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-navy-900">{t.has(`countries.${item.code}`) ? t(`countries.${item.code}`) : item.name}</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{item.notes}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
