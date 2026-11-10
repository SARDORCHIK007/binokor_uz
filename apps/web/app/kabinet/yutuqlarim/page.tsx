import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
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
      path: { title: string; state: "pending" | "passed" | "failed"; score: number | null }[];
    };

const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1";

export default async function ProgressPage() {
  const t = await getTranslations("progress");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<Progress>(`/api/v1/me/progress?lang=${locale}`);
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
  const best = Math.max(0, ...data.path.map((step) => step.score ?? 0));
  const badges = [
    { key: "firstLesson", icon: "🧱", on: data.lessons >= 1 },
    { key: "attendance80", icon: "📅", on: data.lessons >= 3 && (data.attendance ?? 0) >= 80 },
    { key: "firstModule", icon: "✅", on: data.passed >= 1 },
    { key: "score90", icon: "⭐", on: best >= 90 },
    { key: "hours20", icon: "⛑️", on: data.site_hours >= 20 },
    { key: "vocab7", icon: "📖", on: data.vocab_days >= 7 },
    { key: "allModules", icon: "🏆", on: data.modules > 0 && data.passed === data.modules },
  ];
  const current = data.path.findIndex((step) => step.state !== "passed");
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

      {data.path.length > 0 ? (
        <section className={CARD} aria-labelledby="path">
          <h2 id="path" className="text-sm font-bold text-navy-900">{t("path")}</h2>
          <ol className="mt-5 flex flex-col">
            {data.path.map((step, index) => {
              const state = step.state === "passed" ? "done" : index === current ? "now" : "todo";
              return (
                <li key={`${step.title}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < data.path.length - 1 ? (
                    <span className={`absolute top-8 bottom-0 left-4 w-0.5 -translate-x-1/2 ${state === "done" ? "bg-success-600" : "bg-line-strong"}`} aria-hidden="true" />
                  ) : null}
                  <span
                    className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
                      state === "done" ? "bg-success-600 text-white" : state === "now" ? "bg-primary text-white ring-4 ring-blue-100" : "bg-surface-100 text-muted ring-1 ring-line-strong"
                    }`}
                    aria-hidden="true"
                  >
                    {state === "done" ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className={`font-bold ${state === "todo" ? "text-muted" : "text-navy-900"}`}>{step.title}</p>
                    <p className="text-xs text-muted">
                      {step.state === "pending"
                        ? state === "now"
                          ? t("pathNow")
                          : t("pathTodo")
                        : step.state === "passed"
                          ? t("pathPassed", { score: step.score ?? 0 })
                          : t("pathFailed", { score: step.score ?? 0 })}
                    </p>
                  </div>
                </li>
              );
            })}
            <li className="flex gap-4 pt-6">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${current === -1 ? "bg-accent text-navy-900" : "bg-surface-100 text-muted ring-1 ring-line-strong"}`} aria-hidden="true">
                🎓
              </span>
              <p className={`pt-1 font-bold ${current === -1 ? "text-navy-900" : "text-muted"}`}>{t("pathCert")}</p>
            </li>
          </ol>
        </section>
      ) : null}

      <section className={CARD} aria-labelledby="badges">
        <h2 id="badges" className="text-sm font-bold text-navy-900">
          {t("badges")} <span className="font-medium text-muted">· {badges.filter((badge) => badge.on).length}/{badges.length}</span>
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((badge) => (
            <li
              key={badge.key}
              className={`rounded-2xl border p-4 text-center transition ${badge.on ? "border-accent/50 bg-warning-100" : "border-line bg-surface-100 opacity-60 grayscale"}`}
            >
              <span className="text-3xl" aria-hidden="true">{badge.icon}</span>
              <p className="mt-2 text-sm font-bold text-navy-900">{t(`badge.${badge.key}` as "badge.firstLesson")}</p>
              <p className="mt-0.5 text-xs text-muted">{badge.on ? t("badgeOn") : t(`badgeHow.${badge.key}` as "badgeHow.firstLesson")}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
