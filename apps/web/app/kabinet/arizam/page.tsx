import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Event = { status: string; at: string };
type Application = {
  id: string;
  status: string;
  matrix: string | null;
  track: string;
  trade: string;
  trade_code: string;
  created_at: string;
  rejection_reason: string | null;
  events: Event[];
};

/** The happy path an application walks through (FR-APP-STATUS). */
const PATH = ["SUBMITTED", "SCREENING", "INTERVIEW", "ACCEPTED", "ENROLLED"] as const;
const TERMINAL = new Set(["REJECTED", "WAITLIST", "WITHDRAWN"]);
const HINTS = new Set(["SUBMITTED", "SCREENING", "INTERVIEW", "ACCEPTED", "ENROLLED", "WAITLIST", "REJECTED"]);

function day(iso: string): string {
  return iso.slice(0, 10);
}

export default async function MyApplicationPage() {
  const t = await getTranslations("myApp");
  const states = await getTranslations("states");
  const rows = await apiAuth<Application[]>("/api/v1/applications/mine");
  if (!rows) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        text={t("emptyText")}
        action={
          <Link href="/ariza" className={buttonClass()}>
            {t("apply")}
          </Link>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
      {rows.map((app) => {
        const reached = new Set(app.events.map((event) => event.status));
        const at = Object.fromEntries(app.events.map((event) => [event.status, event.at]));
        const stopped = TERMINAL.has(app.status);
        // Index of the furthest happy-path step reached.
        const current = Math.max(0, ...PATH.map((step, index) => (reached.has(step) || app.status === step ? index : 0)));
        return (
          <article key={app.id} className="rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wider text-primary uppercase">{t(`track_${app.track}` as "track_DOMESTIC")}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-navy-900">{app.trade}</h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  app.status === "REJECTED"
                    ? "bg-danger-100 text-danger-600"
                    : app.status === "WAITLIST"
                      ? "bg-warning-100 text-warning-600"
                      : app.status === "ACCEPTED" || app.status === "ENROLLED"
                        ? "bg-success-100 text-success-600"
                        : "bg-blue-100 text-primary"
                }`}
              >
                {t(`step.${app.status}` as "step.SUBMITTED")}
              </span>
            </header>

            <ol className="mt-6 grid gap-3 sm:grid-cols-5" aria-label={t("history")}>
              {PATH.map((step, index) => {
                const done = !stopped && index <= current;
                const active = !stopped && index === current;
                return (
                  <li key={step} className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
                    <span className="flex w-full items-center gap-2">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                          done ? "bg-primary text-white" : "bg-surface-100 text-faint"
                        } ${active ? "ring-4 ring-primary/20" : ""}`}
                        aria-current={active ? "step" : undefined}
                      >
                        {done && !active ? <Icon name="check" className="size-4" /> : index + 1}
                      </span>
                      {index < PATH.length - 1 ? (
                        <span className={`hidden h-0.5 flex-1 rounded-full sm:block ${!stopped && index < current ? "bg-primary" : "bg-line"}`} />
                      ) : null}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${done ? "text-navy-900" : "text-faint"}`}>
                        {t(`step.${step}` as "step.SUBMITTED")}
                      </span>
                      {at[step] ? <time className="block text-xs text-muted tabular-nums">{day(at[step])}</time> : null}
                    </span>
                  </li>
                );
              })}
            </ol>

            {HINTS.has(app.status) ? (
              <div
                className={`mt-6 flex gap-3 rounded-xl p-4 text-sm ${
                  app.status === "REJECTED" ? "bg-danger-100 text-danger-600" : "bg-blue-50 text-navy-900"
                }`}
              >
                <Icon name="clock" className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-bold">{t("next")}</p>
                  <p className="mt-0.5">{t(`hint.${app.status}` as "hint.SUBMITTED")}</p>
                  {app.rejection_reason ? (
                    <p className="mt-2">
                      <span className="font-semibold">{t("reason")}:</span> {app.rejection_reason}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">{t("submitted")}</dt>
                <dd className="font-semibold text-navy-900 tabular-nums">{day(app.created_at)}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("matrix")}</dt>
                <dd className="font-semibold text-navy-900">{app.matrix ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">{t("history")}</dt>
                <dd className="font-semibold text-navy-900">
                  {app.events.map((event) => t(`step.${event.status}` as "step.SUBMITTED")).join(" → ")}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">{t("notify")}</p>
          </article>
        );
      })}
    </div>
  );
}
