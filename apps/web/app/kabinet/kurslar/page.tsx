import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Course = {
  id: string;
  title: string;
  trade: string;
  track: string;
  start_date: string;
  end_date: string;
};

export default async function CoursesPage() {
  const t = await getTranslations("cabinet");
  const rows = await apiAuth<Course[]>("/api/v1/admin/courses");
  if (!rows) {
    return <EmptyState title={t("loadError")} text={t("loadErrorText")} />;
  }
  if (rows.length === 0) {
    return <EmptyState title={t("courses")} text={t("groupsEmptyText")} />;
  }
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-900">{t("courses")}</h1>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md border border-line bg-card p-4">
            <p className="font-semibold">{row.title}</p>
            <p className="text-sm text-muted">
              {row.trade} · {row.track} · {row.start_date} — {row.end_date}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
