import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Group = {
  id: string;
  code: string;
  mentor: string;
  students: number;
  max_students: number;
};

export default async function GroupsPage() {
  const t = await getTranslations("cabinet");
  const rows = await apiAuth<Group[]>("/api/v1/admin/groups");
  if (!rows) {
    return <EmptyState title={t("loadError")} text={t("loadErrorText")} />;
  }
  if (rows.length === 0) {
    return <EmptyState title={t("groupsEmpty")} text={t("groupsEmptyText")} />;
  }
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-900">{t("groups")}</h1>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md border border-line bg-card p-4">
            <p className="font-semibold">{row.code}</p>
            <p className="text-sm text-muted">{row.mentor}</p>
            <p className="mt-2 tabular-nums">
              {row.students} / {row.max_students}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
