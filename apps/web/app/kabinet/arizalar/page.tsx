import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { AppDecision } from "@/components/cabinet/AppDecision";
import { FilterableList } from "@/components/cabinet/FilterableList";
import { Badge, CARD, PageHead, Tile, initials, type Tone } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Row = { id: string; status: string; matrix: string | null; type: string; name: string; trade: string };

const ACTIONABLE = new Set(["SUBMITTED", "SCREENING", "VOUCHER_CHECK", "INTERVIEW", "TRIAL", "WAITLIST"]);
const ACCEPTED = new Set(["ACCEPTED", "ENROLLED"]);
const REJECTED = new Set(["REJECTED", "WITHDRAWN"]);

function groupOf(status: string): "accepted" | "rejected" | "pending" {
  return ACCEPTED.has(status) ? "accepted" : REJECTED.has(status) ? "rejected" : "pending";
}

const TONE: Record<string, Tone> = { pending: "amber", accepted: "green", rejected: "red" };

export default async function AdminApplicationsPage() {
  const t = await getTranslations("adm");
  const rows = await apiAuth<Row[]>("/api/v1/admin/applications");
  if (!rows) {
    return <EmptyState title={t("loadError")} text="" />;
  }
  const count = (name: string) => rows.filter((row) => groupOf(row.status) === name).length;
  const items = rows.map((row) => {
    const group = groupOf(row.status);
    return {
      key: row.id,
      search: `${row.name} ${row.trade}`,
      group,
      node: (
        <article className={`${CARD} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
              {initials(row.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-navy-900">{row.name}</p>
              <p className="truncate text-sm text-muted">
                {row.trade} · {t(`appType.${row.type}` as "appType.YOUTH")}
              </p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone={TONE[group]}>{t(`appStatus.${row.status}` as "appStatus.DRAFT")}</Badge>
                {row.matrix ? <Badge tone="blue">{t("apps.class", { c: row.matrix })}</Badge> : null}
              </p>
            </div>
          </div>
          {ACTIONABLE.has(row.status) ? <AppDecision id={row.id} /> : null}
        </article>
      ),
    };
  });
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("apps.title")} text={t("apps.text")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label={t("apps.pending")} value={count("pending")} tone="amber" />
        <Tile label={t("apps.accepted")} value={count("accepted")} tone="green" />
        <Tile label={t("apps.rejected")} value={count("rejected")} tone="red" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t("apps.empty")} text="" />
      ) : (
        <FilterableList
          items={items}
          groups={[
            { value: "pending", label: t("apps.pending") },
            { value: "accepted", label: t("apps.accepted") },
            { value: "rejected", label: t("apps.rejected") },
          ]}
        />
      )}
    </div>
  );
}
