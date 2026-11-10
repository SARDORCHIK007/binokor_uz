import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Schedule = { groups: string[]; lessons: { date: string; weekday: string; time: string; group: string }[] };

export default async function SchedulePage() {
  const t = await getTranslations("schedule");
  const states = await getTranslations("states");
  const data = await apiAuth<Schedule>("/api/v1/me/schedule?days=14");
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const today = new Date();
  const iso = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("text")}</p>
      </div>
      {data.lessons.length === 0 ? (
        <EmptyState title={t("empty")} text={t("emptyText")} />
      ) : (
        <ol className="flex flex-col gap-3">
          {data.lessons.map((lesson) => {
            const when = lesson.date === iso(0) ? t("today") : lesson.date === iso(1) ? t("tomorrow") : null;
            return (
              <li
                key={`${lesson.date}-${lesson.group}`}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sh1 ${when === t("today") ? "border-primary" : "border-line"}`}
              >
                <div>
                  <p className="font-bold text-navy-900">
                    {t(`weekdays.${lesson.weekday}` as "weekdays.Du")}
                    {when ? <span className="ml-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">{when}</span> : null}
                  </p>
                  <p className="text-sm tabular-nums text-muted">{lesson.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold tabular-nums text-navy-900">{lesson.time}</p>
                  <p className="text-sm text-muted">{t("group", { code: lesson.group })}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
