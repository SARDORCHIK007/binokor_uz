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
      <div className="p-4">
        <h1 className="text-3xl font-extrabold text-[#071833]">Davomat</h1>
        <ul className="mt-4 flex flex-col gap-2">
          {mine.attendance.map((item) => (
            <li key={item.date} className="rounded-2xl border border-[#e5eaf2] bg-white shadow-sm px-4 py-3">
              {item.date} · {item.status === "PRESENT" ? "Keldi" : item.status === "LATE" ? "Kechikdi" : item.status === "ABSENT_EXCUSED" ? "Sababli" : "Kelmadi"} · {item.site_hours} soat
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
      <h1 className="px-4 pt-4 text-3xl font-extrabold text-[#071833]">Bugungi davomat · {groups[0].code}</h1>
      <AttendanceSheet groupId={groups[0].id} />
    </div>
  );
}
