import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Brigade = { id: string; name: string; trade: string; status: string; members: number };

export default async function BrigadesPage() {
  const t = await getTranslations("states");
  const rows = await apiGet<Brigade[]>("/api/v1/public/brigades");
  if (!rows) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title="Tayyor brigada yo'q" text="Hozircha ochiq brigada yo'q." />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">Brigadalar</h1>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {rows.map((item) => (
          <li key={item.id} className="rounded-md border border-line bg-card p-4">
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="mt-2 text-sm text-muted">
              {item.trade} · {item.members} a'zo · tayyor
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
