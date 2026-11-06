import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { activeRole, apiAuth, readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type AdminDash = {
  kpi: { applications: number; enrolled: number; certified: number; employed: number };
  funnel: { key: string; value: number }[];
  queue: { id: string; status: string; trade: string }[];
  alerts: { name: string; days: number }[];
};

type MentorDash = {
  groups: { id: string; code: string; students: number; max_students: number }[];
  at_risk: { name: string; missed: number }[];
};

type StudentDash = {
  enrollment: { course: string; group: string; schedule: unknown } | null;
  attendance_pct: number | null;
  remaining: string[];
};

type Payload = {
  role: string;
  admin?: AdminDash;
  mentor?: MentorDash;
  student?: StudentDash;
};

export default async function CabinetHome() {
  const t = await getTranslations("cabinet");
  const sessionText = await getTranslations("session");
  const session = await readSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          title={sessionText("title")}
          text={sessionText("guest")}
          action={
            <Link href="/kirish" className={buttonClass()}>
              {sessionText("login")}
            </Link>
          }
        />
      </div>
    );
  }
  const role = await activeRole(session.roles);
  const data = await apiAuth<Payload>(`/api/v1/cabinet/dashboard?role=${role}`);
  if (!data) {
    return <EmptyState title={t("loadError")} text={t("loadErrorText")} />;
  }
  if (data.admin) {
    return <AdminHome data={data.admin} />;
  }
  if (data.mentor) {
    return <MentorHome data={data.mentor} />;
  }
  return <StudentHome data={data.student ?? { enrollment: null, attendance_pct: null, remaining: [] }} />;
}

async function AdminHome({ data }: { data: AdminDash }) {
  const t = await getTranslations("cabinet");
  const cards = [
    ["kpiApplications", data.kpi.applications],
    ["kpiEnrolled", data.kpi.enrolled],
    ["kpiCertified", data.kpi.certified],
    ["kpiEmployed", data.kpi.employed],
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-navy-900">{t("panel")}</h1>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, value]) => (
          <div key={key} className="rounded-md border border-line bg-card p-4 shadow-sh1">
            <dt className="text-sm text-muted">{t(key)}</dt>
            <dd className="text-3xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-md border border-line bg-card p-4 shadow-sh1">
          <h2 className="font-semibold">{t("funnel")}</h2>
          <ol className="mt-4 flex flex-wrap gap-2">
            {data.funnel.map((item) => (
              <li key={item.key} className="rounded-sm bg-blue-50 px-3 py-2">
                <p className="text-lg font-bold tabular-nums">{item.value}</p>
                <p className="text-xs text-muted">{t(item.key as "applied")}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-md border border-line bg-card p-4 shadow-sh1">
          <h2 className="font-semibold">{t("queue")}</h2>
          {data.queue.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={t("queueEmpty")} text={t("queueEmptyText")} />
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {data.queue.map((item) => (
                <li key={item.id} className="text-sm">
                  {item.trade} · {item.status}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-md border border-line bg-card p-4 shadow-sh1 lg:col-span-2">
          <h2 className="font-semibold">{t("alerts")}</h2>
          {data.alerts.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={t("alertsEmpty")} text={t("alertsEmptyText")} />
            </div>
          ) : (
            <ul className="mt-3">
              {data.alerts.map((item) => (
                <li key={item.name}>
                  {item.name} · {item.days}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

async function MentorHome({ data }: { data: MentorDash }) {
  const t = await getTranslations("cabinet");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-navy-900">{t("myGroups")}</h1>
      {data.groups.length === 0 ? (
        <EmptyState title={t("groupsEmpty")} text={t("groupsEmptyText")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.groups.map((group) => (
            <li key={group.id} className="rounded-md border border-line bg-card p-4">
              <p className="text-lg font-semibold">{group.code}</p>
              <p className="text-sm text-muted tabular-nums">
                {group.students} / {group.max_students}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link href="/kabinet/davomat" className={buttonClass()}>
        {t("todayAttendance")}
      </Link>
      <section>
        <h2 className="mb-3 text-xl font-semibold">{t("atRisk")}</h2>
        {data.at_risk.length === 0 ? (
          <EmptyState title={t("atRiskEmpty")} text={t("atRiskEmptyText")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.at_risk.map((item) => (
              <li key={item.name} className="rounded-md border border-line bg-card px-4 py-3">
                {item.name} · {item.missed}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function StudentHome({ data }: { data: StudentDash }) {
  const t = await getTranslations("cabinet");
  if (!data.enrollment) {
    return <EmptyState title={t("noCourse")} text={t("noCourseText")} />;
  }
  const labels: Record<string, string> = {
    attendance: t("remainingAttendance"),
    modules: t("remainingModules"),
    exam: t("remainingExam"),
  };
  const schedule = JSON.stringify(data.enrollment.schedule);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-navy-900">{t("myCourse")}</h1>
      <section className="rounded-md border border-line bg-card p-4">
        <p className="text-lg font-semibold">{data.enrollment.course || data.enrollment.group}</p>
        <p className="mt-1 text-sm text-muted">{data.enrollment.group}</p>
      </section>
      <section className="rounded-md border border-line bg-card p-4">
        <h2 className="font-semibold">{t("schedule")}</h2>
        <p className="mt-2 text-sm">{schedule}</p>
      </section>
      <section className="rounded-md border border-line bg-card p-4">
        <h2 className="font-semibold">{t("attendancePct")}</h2>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {data.attendance_pct === null ? "—" : `${data.attendance_pct}%`}
        </p>
      </section>
      <section className="rounded-md border border-line bg-card p-4">
        <h2 className="font-semibold">{t("remaining")}</h2>
        {data.remaining.length === 0 ? (
          <p className="mt-2 text-sm text-muted">—</p>
        ) : (
          <ul className="mt-2 list-disc pl-5">
            {data.remaining.map((item) => (
              <li key={item}>{labels[item] ?? item}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
