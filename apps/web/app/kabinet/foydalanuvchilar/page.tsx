import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type UserRow = { id: string; full_name: string; roles: string[] };

const ROLE_KEY: Record<string, "admin" | "mentor" | "student"> = {
  admin: "admin",
  mentor: "mentor",
  student: "student",
};

export default async function UsersPage() {
  const t = await getTranslations("cabinet");
  const roles = await getTranslations("roles");
  const rows = await apiAuth<UserRow[]>("/api/v1/admin/users");
  if (!rows) {
    return <EmptyState title={t("loadError")} text={t("loadErrorText")} />;
  }
  if (rows.length === 0) {
    return <EmptyState title={t("users")} text={t("groupsEmptyText")} />;
  }
  return (
    <div>
      <h1 className="text-3xl font-bold text-navy-900">{t("users")}</h1>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-card px-4 py-3">
            <span className="font-medium">{row.full_name}</span>
            <span className="text-sm text-muted">
              {row.roles.map((role) => (ROLE_KEY[role] ? roles(ROLE_KEY[role]) : role)).join(", ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
