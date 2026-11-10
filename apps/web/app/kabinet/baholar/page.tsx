import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { GradeSheet } from "@/components/cabinet/GradeSheet";
import { Badge, CARD, Meter, PageHead, Tile } from "@/components/cabinet/kit";
import { activeRole, apiAuth, readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Group = { id: string; code: string };
type Mine = { grades: { module: string; score: number; passed: boolean }[] };

export default async function GradesPage() {
  const t = await getTranslations("gr");
  const att = await getTranslations("att");
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
    if (mine.grades.length === 0) {
      return <EmptyState title={t("empty")} text={t("emptyText")} />;
    }
    const average = Math.round(mine.grades.reduce((sum, item) => sum + item.score, 0) / mine.grades.length);
    const passed = mine.grades.filter((item) => item.passed).length;
    return (
      <div className="flex flex-col gap-6">
        <PageHead title={t("title")} text={t("text")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Tile label={t("average")} value={average} tone="blue" />
          <Tile label={t("passed")} value={`${passed}/${mine.grades.length}`} tone="blue" />
        </div>
        <ul className="grid gap-3 lg:grid-cols-2">
          {mine.grades.map((item) => (
            <li key={item.module} className={CARD}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-navy-900">{item.module}</p>
                <Badge tone={item.passed ? "green" : "red"}>{item.passed ? t("pass") : t("fail")}</Badge>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-navy-900 tabular-nums">{item.score}</p>
              <div className="mt-2">
                <Meter value={item.score} tone={item.passed ? "green" : "red"} label={item.module} />
              </div>
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
    return <EmptyState title={att("noGroup")} text={att("noGroupText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("mentorTitle")} text={t("group", { code: groups[0].code })} />
      <GradeSheet groupId={groups[0].id} />
    </div>
  );
}
