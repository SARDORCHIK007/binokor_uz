import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { Badge, CARD, Meter, PageHead, initials } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Member = { name: string; learned: number; total: number; last_answer_at: string | null };

export default async function CuratorPage() {
  const t = await getTranslations("states");
  const c = await getTranslations("cur");
  const members = await apiAuth<Member[]>("/api/v1/curator/group");
  if (!members) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }
  if (members.length === 0) {
    return <EmptyState title={t("noStudentsCurator")} text={t("noStudentsCuratorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={c("title")} text={c("text")} />
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => {
          const pct = member.total > 0 ? Math.round((100 * member.learned) / member.total) : 0;
          return (
            <li key={member.name} className={`${CARD} flex flex-col gap-3`}>
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">{initials(member.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-navy-900">{member.name}</p>
                  <p className="text-xs text-muted">{member.last_answer_at ? c("last", { day: member.last_answer_at.slice(0, 10) }) : c("never")}</p>
                </div>
                <Badge tone={pct >= 70 ? "green" : pct >= 30 ? "amber" : "gray"}>{pct}%</Badge>
              </div>
              <p className="text-sm text-navy-900">{c("learned", { a: member.learned, b: member.total })}</p>
              <Meter value={pct} tone={pct >= 70 ? "green" : "blue"} label={`${member.name} ${pct}%`} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
