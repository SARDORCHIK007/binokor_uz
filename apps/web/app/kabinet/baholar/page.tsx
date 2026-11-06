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
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Baholar</h1>
        <ul className="mt-4 flex flex-col gap-2">
          {mine.grades.map((item) => (
            <li key={item.module} className="rounded-md border border-line bg-card px-3 py-2">
              {item.module} · {item.score} · {item.passed ? "O'tdi" : "O'tmadi"}
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
      <h1 className="px-4 pt-4 text-2xl font-semibold">Baholar · {groups[0].code}</h1>
      <GradeSheet groupId={groups[0].id} />
    </div>
  );
}
