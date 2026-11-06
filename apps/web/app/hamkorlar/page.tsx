import { EmptyState, StatusBadge, type StatusTone } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
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
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">{t("home.partnersTitle")}</h1>
      <p className="mt-2 max-w-[62ch] text-muted">{t("home.partnersText")}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {home.partners.map((partner) => (
          <li key={partner.name} className="rounded-md border border-line bg-card p-4">
            <h2 className="mb-3 text-lg font-semibold">{partner.name}</h2>
            <StatusBadge tone={tone[partner.status]}>{partner.status}</StatusBadge>
          </li>
        ))}
      </ul>
    </div>
  );
}
