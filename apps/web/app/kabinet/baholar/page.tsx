import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { GradeSheet } from "@/components/cabinet/GradeSheet";
import { activeRole, apiAuth, readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Group = { id: string; code: string };
type Mine = { grades: { module: string; score: number; passed: boolean }[] };

export default async function GradesPage() {
  const t = await getTranslations("states");
  const session = await readSession();
  if (!session) {
    return <EmptyState title={t("errorTitle")} text="Baholar uchun kiring." />;
  }
  const role = await activeRole(session.roles);
  if (role === "student") {
    const mine = await apiAuth<Mine>("/api/v1/learning/mine");
    if (!mine) {
      return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
    }
    if (mine.grades.length === 0) {
      return <EmptyState title="Baho yo'q" text="Ustoz hali baho qo'ymagan." />;
    }
    return (
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Baholar</h1>
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card shadow-sh1">
          {mine.grades.map((item) => (
            <li key={item.module} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
              <span className="font-semibold text-navy-900">{item.module}</span>
              <span className="flex items-center gap-4">
                <span className="text-lg font-extrabold tabular-nums text-navy-900">{item.score}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    item.passed ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"
                  }`}
                >
                  {item.passed ? "O'tdi" : "O'tmadi"}
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
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-navy-900">Baholar · {groups[0].code}</h1>
      <GradeSheet groupId={groups[0].id} />
    </div>
  );
}
