import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Badge, CARD, Meter, PageHead, Tile, initials } from "@/components/cabinet/kit";
import { scoreTone } from "@/components/monitoring/TeacherDetail";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Teacher = {
  id: string;
  name: string;
  groups: number;
  students: number;
  responses: number;
  survey: number | null;
  score: number | null;
  parts: Record<"survey" | "results" | "attendance" | "journal", number | null>;
};
type Overview = {
  kpi: { students: number; teachers: number; groups: number; attendance: number | null; score: number | null; pass_rate: number | null; at_risk: number; survey_answers: number; survey_expected: number };
  round: string;
  weights: Record<string, number>;
  teachers: Teacher[];
};

export default async function MonitoringPage() {
  const t = await getTranslations("mon");
  const states = await getTranslations("states");
  const data = await apiAuth<Overview>("/api/v1/monitoring/overview");
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const { kpi } = data;
  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);
  const parts = ["survey", "results", "attendance", "journal"] as const;
  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={t("title")}
        text={t("text")}
        actions={
          <Link href="/kabinet/monitoring/tinglovchilar" className="rounded-xl border border-line-strong bg-card px-4 py-2 text-sm font-bold text-navy-900 hover:border-primary hover:text-primary">
            {t("studentsLink")} →
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("kpi.students")} value={kpi.students} tone="blue" />
        <Tile label={t("kpi.teachers")} value={kpi.teachers} tone="blue" />
        <Tile label={t("kpi.groups")} value={kpi.groups} tone="blue" />
        <Tile label={t("kpi.survey")} value={`${kpi.survey_answers}/${kpi.survey_expected}`} tone="amber" hint={t("round", { round: data.round })} />
        <Tile label={t("kpi.attendance")} value={pct(kpi.attendance)} tone={kpi.attendance !== null && kpi.attendance < 80 ? "red" : "green"} />
        <Tile label={t("kpi.score")} value={kpi.score ?? "—"} tone="green" />
        <Tile label={t("kpi.pass_rate")} value={pct(kpi.pass_rate)} tone="green" />
        <Tile label={t("kpi.at_risk")} value={kpi.at_risk} tone={kpi.at_risk > 0 ? "red" : "green"} />
      </div>

      <section className={CARD} aria-labelledby="rank">
        <h2 id="rank" className="text-xl font-extrabold text-navy-900">{t("rankTitle")}</h2>
        <p className="mt-1 text-xs text-muted">
          {t("how", { a: data.weights.survey, b: data.weights.results, c: data.weights.attendance, d: data.weights.journal })}
        </p>
        {data.teachers.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {data.teachers.map((teacher, index) => (
              <li key={teacher.id}>
                <Link href={`/kabinet/monitoring/ustoz/${teacher.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface-100 p-4 transition hover:border-primary">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-sm font-extrabold text-navy-900 ring-1 ring-line-strong">{index + 1}</span>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                    {initials(teacher.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-navy-900">{teacher.name}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="gray">{t("col.groups")}: {teacher.groups}</Badge>
                      <Badge tone="gray">{t("col.students")}: {teacher.students}</Badge>
                      <Badge tone="blue">{t("col.survey")}: {teacher.survey === null ? "—" : teacher.survey.toFixed(1)} · {t("responses", { n: teacher.responses })}</Badge>
                    </span>
                  </span>
                  <span className="hidden w-64 shrink-0 grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted md:grid">
                    {parts.map((part) => (
                      <span key={part} className="flex items-center justify-between gap-2">
                        <span className="truncate">{t(`parts.${part}`)}</span>
                        <span className="font-bold tabular-nums text-navy-900">{teacher.parts[part] ?? "—"}</span>
                      </span>
                    ))}
                  </span>
                  <span className="w-28 shrink-0 text-right">
                    <span className="block text-3xl font-extrabold tabular-nums text-navy-900">{teacher.score ?? "—"}</span>
                    <Meter value={teacher.score ?? 0} tone={scoreTone(teacher.score)} label={teacher.name} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
