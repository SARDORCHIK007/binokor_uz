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
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("users")}</h1>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-sh1">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-canvas">
            <span className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                {row.full_name.charAt(0)}
              </span>
              <span className="font-semibold text-navy-900">{row.full_name}</span>
            </span>
            <span className="flex flex-wrap gap-1.5">
              {row.roles.map((role) => (
                <span key={role} className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-semibold text-muted">
                  {ROLE_KEY[role] ? roles(ROLE_KEY[role]) : role}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
