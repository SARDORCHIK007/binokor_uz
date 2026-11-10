import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { FilterableList } from "@/components/cabinet/FilterableList";
import { Badge, CARD, PageHead, initials } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type UserRow = { id: string; full_name: string; roles: string[] };

const STAFF = new Set(["admin", "superadmin", "education_lead", "cert_officer", "placement_manager", "coordinator"]);
const TEACH = new Set(["mentor", "teacher", "curator"]);

function kind(roles: string[]): "staff" | "teach" | "learner" | "partner" {
  if (roles.some((role) => STAFF.has(role))) return "staff";
  if (roles.some((role) => TEACH.has(role))) return "teach";
  if (roles.some((role) => ["student", "worker"].includes(role))) return "learner";
  return "partner";
}

export default async function UsersPage() {
  const t = await getTranslations("adm");
  const roles = await getTranslations("roles");
  const rows = await apiAuth<UserRow[]>("/api/v1/admin/users");
  if (!rows) {
    return <EmptyState title={t("loadError")} text="" />;
  }
  const label = (role: string) => (roles.has(role as "admin") ? roles(role as "admin") : role);
  const items = rows.map((row) => ({
    key: row.id,
    search: `${row.full_name} ${row.roles.map(label).join(" ")}`,
    group: kind(row.roles),
    node: (
      <article className={`${CARD} flex flex-wrap items-center justify-between gap-3 py-3`}>
        <span className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
            {initials(row.full_name)}
          </span>
          <span className="font-bold text-navy-900">{row.full_name}</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {row.roles.map((role) => (
            <Badge key={role} tone={STAFF.has(role) ? "blue" : TEACH.has(role) ? "amber" : "gray"}>
              {label(role)}
            </Badge>
          ))}
        </span>
      </article>
    ),
  }));
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("users.title")} text={t("users.text")} />
      <FilterableList
        items={items}
        placeholder={t("users.search")}
        groups={[
          { value: "staff", label: roles("admin") },
          { value: "teach", label: roles("mentor") },
          { value: "learner", label: roles("student") },
          { value: "partner", label: roles("employer_local") },
        ]}
      />
    </div>
  );
}
