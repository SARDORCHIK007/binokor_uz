import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function DestinationsPage() {
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
      <h1 className="text-4xl font-semibold text-navy-900">{t("home.destinationsTitle")}</h1>
      <p className="mt-2 max-w-[62ch] text-muted">{t("home.destinationsText")}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {home.destinations.map((item) => (
          <li key={item.code} className="rounded-md border border-line bg-card p-4">
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="mt-1 text-sm text-muted">{item.language}</p>
            <p className="mt-2 text-sm">{item.notes}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
