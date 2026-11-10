import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { FilterableList } from "@/components/cabinet/FilterableList";
import { Badge, CARD_HOVER, Meter, PageHead } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Group = { id: string; code: string; mentor: string; students: number; max_students: number };

export default async function GroupsPage() {
  const t = await getTranslations("adm");
  const rows = await apiAuth<Group[]>("/api/v1/admin/groups");
  if (!rows) {
    return <EmptyState title={t("loadError")} text="" />;
  }
  const items = rows.map((row) => {
    const full = row.students >= row.max_students;
    return {
      key: row.id,
      search: `${row.code} ${row.mentor}`,
      group: full ? "full" : "open",
      node: (
        <article className={CARD_HOVER}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-navy-900">{row.code}</p>
              <p className="text-sm text-muted">
                {t("groups.mentor")}: {row.mentor}
              </p>
            </div>
            <Badge tone={full ? "red" : "green"}>{full ? t("groups.full") : t("groups.free", { n: row.max_students - row.students })}</Badge>
          </div>
          <p className="mt-4 mb-2 text-sm font-semibold tabular-nums text-navy-900">
            {t("groups.students", { n: row.students, max: row.max_students })}
          </p>
          <Meter value={(100 * row.students) / Math.max(1, row.max_students)} tone={full ? "red" : "blue"} label={row.code} />
        </article>
      ),
    };
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("groups.title")} text={t("groups.text")} />
      {rows.length === 0 ? (
        <EmptyState title={t("groups.empty")} text="" />
      ) : (
        <FilterableList
          items={items}
          layout="grid"
          groups={[
            { value: "open", label: "✓" },
            { value: "full", label: t("groups.full") },
          ]}
        />
      )}
    </div>
  );
}
