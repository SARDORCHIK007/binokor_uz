import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { AttendanceSheet } from "@/components/cabinet/AttendanceSheet";
import { Badge, CARD, Meter, PageHead, type Tone } from "@/components/cabinet/kit";
import { apiAuth, activeRole, readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Group = { id: string; code: string };
type Mine = { attendance: { date: string; status: string; site_hours: number }[] };

const TONE: Record<string, Tone> = { PRESENT: "green", LATE: "amber", ABSENT_EXCUSED: "blue", ABSENT_UNEXCUSED: "red" };

export default async function AttendancePage() {
  const t = await getTranslations("att");
  const states = await getTranslations("states");
  const session = await readSession();
  if (!session) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const role = await activeRole(session.roles);
  if (role === "student") {
    const mine = await apiAuth<Mine>("/api/v1/learning/mine");
    if (!mine) {
      return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
    }
    if (mine.attendance.length === 0) {
      return <EmptyState title={t("mineEmpty")} text={t("mineEmptyText")} />;
    }
    const present = mine.attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
    const rate = Math.round((100 * present) / mine.attendance.length);
    return (
      <div className="flex flex-col gap-6">
        <PageHead title={t("mineTitle")} />
        <section className={CARD}>
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-semibold text-muted">{t("mineRate")}</p>
            <p className="text-4xl font-extrabold text-navy-900 tabular-nums">{rate}%</p>
          </div>
          <div className="mt-3">
            <Meter value={rate} tone={rate >= 80 ? "green" : "red"} label={t("mineRate")} />
          </div>
        </section>
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-sh1">
          {mine.attendance.map((item) => (
            <li key={item.date} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
              <time dateTime={item.date} className="font-semibold tabular-nums text-navy-900">
                {item.date}
              </time>
              <span className="flex items-center gap-4">
                <span className="tabular-nums text-muted">{t("hours", { n: item.site_hours })}</span>
                <Badge tone={TONE[item.status] ?? "gray"}>{t(`status.${item.status}` as "status.PRESENT")}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const groups = await apiAuth<Group[]>("/api/v1/learning/my-groups");
  if (!groups) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  if (groups.length === 0) {
    return <EmptyState title={t("noGroup")} text={t("noGroupText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("title")} text={t("group", { code: groups[0].code })} />
      <AttendanceSheet groupId={groups[0].id} />
    </div>
  );
}
