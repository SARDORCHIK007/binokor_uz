import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { AttendanceSheet } from "@/components/cabinet/AttendanceSheet";
import { apiAuth, activeRole, readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Group = { id: string; code: string };
type Mine = { attendance: { date: string; status: string; site_hours: number }[] };

export default async function AttendancePage() {
  const t = await getTranslations("states");
  const session = await readSession();
  if (!session) {
    return <EmptyState title={t("errorTitle")} text="Davomat uchun kiring." />;
  }
  const role = await activeRole(session.roles);
  if (role === "student") {
    const mine = await apiAuth<Mine>("/api/v1/learning/mine");
    if (!mine) {
      return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
    }
    if (mine.attendance.length === 0) {
      return <EmptyState title="Davomat yo'q" text="Hali belgi qo'yilmagan." />;
    }
    return (
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Davomat</h1>
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-sh1">
          {mine.attendance.map((item) => (
            <li key={item.date} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
              <time dateTime={item.date} className="font-semibold tabular-nums text-navy-900">{item.date}</time>
              <span className="flex items-center gap-4">
                <span className="tabular-nums text-muted">{item.site_hours} soat</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    item.status === "PRESENT"
                      ? "bg-success-100 text-success-600"
                      : item.status === "LATE" || item.status === "ABSENT_EXCUSED"
                        ? "bg-warning-100 text-warning-600"
                        : "bg-danger-100 text-danger-600"
                  }`}
                >
                  {item.status === "PRESENT" ? "Keldi" : item.status === "LATE" ? "Kechikdi" : item.status === "ABSENT_EXCUSED" ? "Sababli" : "Kelmadi"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const groups = await apiAuth<Group[]>("/api/v1/learning/my-groups");
  if (!groups) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }
  if (groups.length === 0) {
    return <EmptyState title="Guruh yo'q" text="Sizga hali guruh biriktirilmagan." />;
  }
  return (
    <div>
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-navy-900">Bugungi davomat · {groups[0].code}</h1>
      <AttendanceSheet groupId={groups[0].id} />
    </div>
  );
}
