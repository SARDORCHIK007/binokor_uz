import { EmptyState, StatusBadge, type StatusTone } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/brand/Icon";
import { CARD, ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

const tone: Record<HomePayload["partners"][number]["status"], StatusTone> = {
  SIGNED: "success",
  NEGOTIATING: "warning",
  PLANNED: "info",
  ENDED: "danger",
};

export default async function PartnersPage() {
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
      <PageHeader title={t("home.partnersTitle")} text={t("home.partnersText")} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {home.partners.map((partner) => (
          <li key={partner.name} className={`${CARD} flex flex-col`}>
            <span className="grid size-11 place-items-center rounded-xl bg-blue-100 text-primary">
              <Icon name="shield" className="size-5" />
            </span>
            <h2 className="mt-4 mb-4 flex-1 text-base font-bold leading-snug text-navy-900">{partner.name}</h2>
            <div>
              <StatusBadge tone={tone[partner.status]}>{partner.status}</StatusBadge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
