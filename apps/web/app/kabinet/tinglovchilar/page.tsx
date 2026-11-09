import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Student = {
  id: string;
  name: string;
  group: string;
  attendance: number | null;
  lessons: number;
  average: number | null;
  last_lesson: string | null;
  at_risk: boolean;
};

export default async function StudentsPage() {
  const t = await getTranslations("students");
  const states = await getTranslations("states");
  const students = await apiAuth<Student[]>("/api/v1/mentor/students");
  if (!students) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
      </div>
      {students.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => (
            <li key={s.id} className={`rounded-2xl border bg-card p-5 shadow-sh1 ${s.at_risk ? "border-danger-600" : "border-line"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy-900">{s.name}</p>
                  <p className="text-sm text-muted">{s.group}</p>
                </div>
                {s.at_risk ? <span className="rounded-full bg-danger-100 px-2.5 py-1 text-xs font-bold text-danger-600">{t("risk")}</span> : null}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">{t("attendance")}</dt>
                  <dd className="text-xl font-extrabold text-navy-900 tabular-nums">{s.attendance === null ? "—" : `${s.attendance}%`}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t("average")}</dt>
                  <dd className="text-xl font-extrabold text-navy-900 tabular-nums">{s.average ?? "—"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">
                {t("lessons", { n: s.lessons })} · {t("last")}: {s.last_lesson ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
