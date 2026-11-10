import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon, type IconName } from "@/components/brand/Icon";
import { AdminCharts } from "@/components/cabinet/AdminCharts";
import { CountUp } from "@/components/CountUp";
import { OnboardingGuide } from "@/components/cabinet/OnboardingGuide";
import { RoleHome } from "@/components/cabinet/RoleHome";
import { activeRole, apiAuth, readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const KPI_TONES: { bg: string; fg: string; icon: IconName }[] = [
  { bg: "#e4eeff", fg: "#2F6BFF", icon: "users" },
  { bg: "#e3f5ea", fg: "#1f8a4c", icon: "cap" },
  { bg: "#fff1d6", fg: "#b26b00", icon: "award" },
  { bg: "#efe7fb", fg: "#7c5cbf", icon: "briefcase" },
];

type AdminDash = {
  kpi: { applications: number; enrolled: number; certified: number; employed: number };
  funnel: { key: string; value: number }[];
  queue: { id: string; status: string; trade: string }[];
  alerts: { name: string; days: number }[];
  by_trade?: { name: string; value: number }[];
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
  if (!["admin", "mentor", "student"].includes(role)) {
    return (
      <div className="flex flex-col gap-6">
        <OnboardingGuide role={role} />
        <RoleHome role={role} name={session.full_name} />
      </div>
    );
  }
  const data = await apiAuth<Payload>(`/api/v1/cabinet/dashboard?role=${role}`);
  if (!data) {
    return <EmptyState title={t("loadError")} text={t("loadErrorText")} />;
  }
  const body = data.admin ? (
    <AdminHome data={data.admin} />
  ) : data.mentor ? (
    <MentorHome data={data.mentor} />
  ) : (
    <StudentHome data={data.student ?? { enrollment: null, attendance_pct: null, remaining: [] }} />
  );
  return (
    <div className="flex flex-col gap-6">
      <OnboardingGuide role={role} />
      {body}
    </div>
  );
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
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("panel")}</h1>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([key, value], index) => {
          const tone = KPI_TONES[index];
          return (
            <div key={key} className="rounded-2xl p-5 shadow-sh2" style={{ background: tone.bg }}>
              <span className="grid size-10 place-items-center rounded-full bg-white/80" style={{ color: tone.fg }}>
                <Icon name={tone.icon} className="size-5" />
              </span>
              <dd className="mt-3 text-4xl font-extrabold tracking-[-0.03em] text-navy-900 tabular-nums"><CountUp value={value} locale="en-US" /></dd>
              <dt className="mt-1 text-sm font-medium text-body">{t(key)}</dt>
            </div>
          );
        })}
      </dl>
      <AdminCharts
        trend={data.funnel.map((item) => ({ name: t(item.key as "applied"), value: item.value }))}
        trades={data.by_trade ?? []}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-card p-4 shadow-sh1">
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
        <section className="rounded-2xl border border-line bg-card p-4 shadow-sh1">
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
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("myGroups")}</h1>
      {data.groups.length === 0 ? (
        <EmptyState title={t("groupsEmpty")} text={t("groupsEmptyText")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.groups.map((group) => (
            <li key={group.id} className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-navy-900">{group.code}</p>
                <p className="text-sm font-semibold text-muted tabular-nums">
                  {group.students} / {group.max_students}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-100">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (group.students / Math.max(1, group.max_students)) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Link href="/kabinet/davomat" className={buttonClass({ size: "lg" })}>
          {t("todayAttendance")}
        </Link>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-bold text-navy-900">{t("atRisk")}</h2>
        {data.at_risk.length === 0 ? (
          <EmptyState title={t("atRiskEmpty")} text={t("atRiskEmptyText")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {data.at_risk.map((item) => (
              <li key={item.name} className="flex items-center justify-between rounded-2xl border border-line bg-card px-5 py-3.5 text-sm shadow-sh1">
                <span className="font-semibold text-navy-900">{item.name}</span>
                <span className="rounded-full bg-danger-100 px-2.5 py-1 text-xs font-bold text-danger-600 tabular-nums">{item.missed}</span>
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
    return (
      <div >
        <EmptyState title={t("noCourse")} text={t("noCourseText")} />
      </div>
    );
  }
  const labels: Record<string, string> = {
    attendance: t("remainingAttendance"),
    modules: t("remainingModules"),
    exam: t("remainingExam"),
  };
  const schedule = data.enrollment.schedule as { days?: string[]; time?: string } | null;
  const days = ["Du", "Se", "Ch", "Pa", "Ju"];
  const active = new Set(schedule?.days ?? []);
  const percent = data.attendance_pct ?? 0;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Mening o&apos;quv jarayonim</h1>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sh2">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-blue-100 text-navy-900" aria-hidden="true">
            <Icon name="cap" className="size-10" />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-navy-900">{data.enrollment.course || data.enrollment.group}</p>
            <span className="mt-1 inline-block rounded-full bg-success-600 px-3 py-0.5 text-xs font-semibold text-white">O&apos;qish davom etmoqda</span>
            <p className="mt-1 text-sm text-muted">Guruh: {data.enrollment.group}</p>
          </div>
        </div>
        <div
          className="grid size-28 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(#1f8a4c ${percent * 3.6}deg, #E7EEF7 0deg)` }}
          role="img"
          aria-label={`Davomat ${percent}%`}
        >
          <div className="grid size-20 place-items-center rounded-full bg-white text-center">
            <span className="text-xl leading-none font-extrabold text-navy-900">{percent}%</span>
            <span className="-mt-3 text-[10px] text-muted">Davomat</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 text-sm">
          <Link href="/kabinet/lugat" className="rounded-full bg-canvas px-3 py-1.5 font-medium">Lug&apos;at (1000 so&apos;z)</Link>
          <Link href="/kabinet/davomat" className="rounded-full bg-canvas px-3 py-1.5 font-medium">Davomat</Link>
          <Link href="/kabinet/baholar" className="rounded-full bg-canvas px-3 py-1.5 font-medium">Baholar</Link>
        </div>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sh2">
        <h2 className="font-bold text-navy-900">{t("schedule")}</h2>
        <p className="text-sm text-muted">{schedule?.time ?? ""}</p>
        <ol className="mt-3 grid grid-cols-5 gap-2">
          {days.map((day) => (
            <li
              key={day}
              className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center text-sm font-semibold ${active.has(day) ? "border-primary bg-blue-50 text-navy-900" : "border-line bg-white text-faint"}`}
            >
              {day}
              <span className={`grid size-7 place-items-center rounded-full ${active.has(day) ? "bg-primary text-white" : "border border-line-strong"}`}>
                {active.has(day) ? <Icon name="check" className="size-4" /> : null}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">Belgilangan kunlar — dars jadvali.</p>
      </section>
      <section className="rounded-2xl border border-line bg-card p-4">
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
