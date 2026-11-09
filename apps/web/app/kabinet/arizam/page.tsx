import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Application = { id: string; status: string; matrix: string | null; trade: string };

const STATUS: Record<string, string> = {
  SUBMITTED: "Yuborilgan",
  SCREENING: "Ko'rilmoqda",
  ACCEPTED: "Qabul qilindi",
  REJECTED: "Rad etildi",
  WAITLIST: "Navbatda",
};

export default async function MyApplicationPage() {
  const t = await getTranslations("states");
  const rows = await apiAuth<Application[]>("/api/v1/applications/mine");
  if (!rows) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }
  if (rows.length === 0) {
    return <EmptyState title="Ariza yo'q" text="Hali ariza yubormagansiz." />;
  }
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Mening arizam</h1>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-card shadow-sh1 px-4 py-3">
            {item.trade} · {STATUS[item.status] ?? item.status} · toifa {item.matrix ?? "—"}
          </li>
        ))}
      </ul>
    </div>
  );
}
