import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Progress =
  | { enrolled: false }
  | {
      enrolled: true;
      group: string;
      since: string;
      schedule: { days: string[]; time: string };
      lessons: number;
      present: number;
      attendance: number | null;
      site_hours: number;
      graded: number;
      passed: number;
      modules: number;
      average: number | null;
      vocab_days: number;
    };

const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1";

export default async function ProgressPage() {
  const t = await getTranslations("progress");
  const states = await getTranslations("states");
  const data = await apiAuth<Progress>("/api/v1/me/progress");
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  if (!data.enrolled) {
    return (
      <EmptyState
        title={t("empty")}
        text={t("emptyText")}
        action={
          <Link href="/ariza" className={buttonClass()}>
            →
          </Link>
        }
      />
    );
  }
  const tiles = [
    { label: t("attendance"), value: data.attendance === null ? t("noData") : `${data.attendance}%`, note: t("attendanceNote", { present: data.present, lessons: data.lessons }), bar: data.attendance },
    { label: t("average"), value: data.average === null ? t("noData") : String(data.average), note: "", bar: data.average },
    { label: t("modules"), value: `${data.passed}/${data.modules}`, note: t("modulesNote", { passed: data.passed, modules: data.modules }), bar: data.modules ? Math.round((100 * data.passed) / data.modules) : null },
    { label: t("hours"), value: String(data.site_hours), note: "", bar: null },
    { label: t("vocab"), value: String(data.vocab_days), note: "", bar: null },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 text-muted">
          {t("group")}: <span className="font-bold text-navy-900">{data.group}</span> · {data.since}
        </p>
      </div>
      <section className={CARD} aria-labelledby="schedule">
        <h2 id="schedule" className="text-sm font-bold text-navy-900">{t("schedule")}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.schedule.days.map((day) => (
            <span key={day} className="rounded-full bg-primary px-3.5 py-1.5 text-sm font-bold text-white">
              {t(`days.${day}` as "days.Du")}
            </span>
          ))}
          <span className="text-sm font-semibold text-navy-900 tabular-nums">{data.schedule.time}</span>
        </div>
      </section>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className={CARD}>
            <dt className="text-sm text-muted">{tile.label}</dt>
            <dd className="mt-1 text-3xl font-extrabold text-navy-900 tabular-nums">{tile.value}</dd>
            {tile.bar !== null ? (
              <div className="mt-3 h-2 rounded-full bg-blue-100" role="presentation">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, tile.bar)}%` }} />
              </div>
            ) : null}
            {tile.note ? <p className="mt-2 text-xs text-muted">{tile.note}</p> : null}
          </div>
        ))}
      </dl>
    </div>
  );
}
