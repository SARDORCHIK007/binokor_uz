import { getTranslations } from "next-intl/server";
import { Badge, CARD, Meter, Tile, type Tone } from "@/components/cabinet/kit";

export type TeacherDetailData = {
  id: string;
  name: string;
  groups: number;
  students: number;
  responses: number;
  survey: number | null;
  score: number | null;
  parts: Record<"survey" | "results" | "attendance" | "journal", number | null>;
  criteria: Record<string, number | null>;
  trend: { round: string; responses: number; avg: number }[];
  comments: { round: string; text: string }[];
  group_list: { code: string; course: string; students: number; attendance: number | null; score: number | null }[];
  weights: Record<string, number>;
  round: string;
};

export function scoreTone(score: number | null): Tone {
  return score === null ? "gray" : score >= 80 ? "green" : score >= 60 ? "blue" : score >= 40 ? "amber" : "red";
}

/** Everything about one teacher: rating, the four parts, survey criteria, rounds, anonymous comments and groups. */
export async function TeacherDetail({ data }: { data: TeacherDetailData }) {
  const t = await getTranslations("mon");
  const parts = ["survey", "results", "attendance", "journal"] as const;
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("col.score")} value={data.score ?? "—"} tone={scoreTone(data.score)} />
        <Tile label={t("col.survey")} value={data.survey === null ? "—" : `${data.survey.toFixed(1)}`} tone="blue" hint={t("responses", { n: data.responses })} />
        <Tile label={t("col.groups")} value={data.groups} tone="blue" />
        <Tile label={t("col.students")} value={data.students} tone="blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={CARD} aria-labelledby="parts">
          <h2 id="parts" className="text-lg font-extrabold text-navy-900">{t("howTitle")}</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {parts.map((part) => (
              <li key={part}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-navy-900">
                    {t(`parts.${part}`)} <span className="text-xs font-normal text-muted">· {data.weights[part]}%</span>
                  </span>
                  <span className="font-bold tabular-nums text-navy-900">{data.parts[part] ?? t("noData")}</span>
                </div>
                <div className="mt-1.5">
                  <Meter value={data.parts[part] ?? 0} tone={scoreTone(data.parts[part])} label={t(`parts.${part}`)} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            {t("how", { a: data.weights.survey, b: data.weights.results, c: data.weights.attendance, d: data.weights.journal })}
          </p>
        </section>

        <section className={CARD} aria-labelledby="criteria">
          <h2 id="criteria" className="text-lg font-extrabold text-navy-900">{t("col.survey")}</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {Object.entries(data.criteria).map(([key, value]) => (
              <li key={key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-navy-900">{t(`criteria.${key}` as "criteria.expertise")}</span>
                  <span className="font-bold tabular-nums text-navy-900">{value === null ? t("noData") : `${value.toFixed(1)} / 5`}</span>
                </div>
                <div className="mt-1.5">
                  <Meter value={value === null ? 0 : (value / 5) * 100} tone="blue" label={key} />
                </div>
              </li>
            ))}
          </ul>
          {data.trend.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-navy-900">{t("trend")}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {data.trend.map((item) => (
                  <li key={item.round}>
                    <Badge tone="blue">
                      {item.round}: {item.avg.toFixed(1)} · {t("responses", { n: item.responses })}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <section className={CARD} aria-labelledby="groups">
        <h2 id="groups" className="text-lg font-extrabold text-navy-900">{t("groups")}</h2>
        <ul className="mt-3 divide-y divide-line">
          {data.group_list.map((group) => (
            <li key={group.code} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="font-bold text-navy-900">{group.code}</span>
                <span className="text-muted"> · {group.course}</span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                <Badge tone="blue">{t("col.students")}: {group.students}</Badge>
                <Badge tone={group.attendance !== null && group.attendance < 80 ? "red" : "green"}>
                  {t("col.attendance")}: {group.attendance === null ? "—" : `${group.attendance}%`}
                </Badge>
                <Badge tone="gray">{t("col.avg")}: {group.score ?? "—"}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={CARD} aria-labelledby="comments">
        <h2 id="comments" className="text-lg font-extrabold text-navy-900">{t("comments")}</h2>
        <p className="mt-1 text-xs text-muted">{t("anonymous")}</p>
        {data.comments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("noComments")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {data.comments.map((item, index) => (
              <li key={`${item.round}-${index}`} className="rounded-xl border border-line bg-surface-100 p-3 text-sm">
                <p className="text-navy-900">{item.text}</p>
                <p className="mt-1 text-xs text-muted">{item.round}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
