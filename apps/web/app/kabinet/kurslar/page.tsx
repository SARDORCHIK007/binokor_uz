import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { FilterableList } from "@/components/cabinet/FilterableList";
import { Badge, CARD_HOVER, PageHead } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Course = { id: string; title: string; trade: string; track: string; start_date: string; end_date: string };

export default async function CoursesPage() {
  const t = await getTranslations("adm");
  const rows = await apiAuth<Course[]>("/api/v1/admin/courses");
  if (!rows) {
    return <EmptyState title={t("loadError")} text="" />;
  }
  const items = rows.map((row) => ({
    key: row.id,
    search: `${row.title} ${row.trade}`,
    group: row.track,
    node: (
      <article className={CARD_HOVER}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-bold text-navy-900">{row.title}</p>
            <p className="text-sm text-muted">{row.trade}</p>
          </div>
          <Badge tone={row.track === "FOREIGN" ? "amber" : "blue"}>{t(`track.${row.track}` as "track.DOMESTIC")}</Badge>
        </div>
        <p className="mt-3 text-sm font-semibold tabular-nums text-navy-900">{t("courses.period", { from: row.start_date, to: row.end_date })}</p>
      </article>
    ),
  }));
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("courses.title")} text={t("courses.text")} />
      {rows.length === 0 ? (
        <EmptyState title={t("courses.empty")} text="" />
      ) : (
        <FilterableList
          items={items}
          layout="grid"
          groups={[
            { value: "DOMESTIC", label: t("track.DOMESTIC") },
            { value: "FOREIGN", label: t("track.FOREIGN") },
          ]}
        />
      )}
    </div>
  );
}
