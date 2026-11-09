import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { WorkerSettings } from "@/components/cabinet/WorkerSettings";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Worker = {
  slug: string;
  level: string;
  availability: string;
  hours: number;
  rating: number | null;
  rating_count: number;
  visibility: Record<string, boolean>;
  trade: string;
  certificates: { number: string; level: string; trade: string; issued_at: string | null; signed: number; expected: number }[];
  placements: { employer: string; start_date: string; end_date: string | null; salary: number | null }[];
};

const LEVELS = ["APPRENTICE", "ASSISTANT", "MASTER", "FOREMAN"] as const;
const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6";

export default async function WorkerProfilePage() {
  const t = await getTranslations("workerProfile");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const me = await apiAuth<Worker>("/api/v1/me/worker");
  if (!me) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const current = LEVELS.indexOf(me.level as (typeof LEVELS)[number]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
      </div>

      <section className={CARD} aria-labelledby="path">
        <h2 id="path" className="text-sm font-bold text-navy-900">{t("path")}</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-4">
          {LEVELS.map((code, index) => (
            <li
              key={code}
              aria-current={index === current ? "step" : undefined}
              className={`rounded-xl border p-3 text-center text-sm font-bold ${
                index === current
                  ? "border-primary bg-primary text-white"
                  : index < current
                    ? "border-success-600 bg-success-100 text-success-600"
                    : "border-line bg-canvas text-muted"
              }`}
            >
              {index < current ? "✓ " : ""}
              {t(`levels.${code}` as "levels.MASTER")}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted">{t("pathNote")}</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted">{t("hours")}</dt>
            <dd className="text-2xl font-extrabold text-navy-900 tabular-nums">{me.hours}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t("rating")}</dt>
            <dd className="text-2xl font-extrabold text-navy-900 tabular-nums">
              {me.rating === null ? <span className="text-base font-semibold text-muted">{t("noRating")}</span> : `★ ${me.rating.toFixed(1)} (${me.rating_count})`}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t("availability")}</dt>
            <dd className="text-2xl font-extrabold text-navy-900">{t(`availabilities.${me.availability}` as "availabilities.FREE")}</dd>
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className={CARD}>
          <WorkerSettings availability={me.availability} visibility={me.visibility} />
          <Link href={`/ustalar/${me.slug}`} className={`${buttonClass({ variant: "ghost" })} mt-4`}>
            {t("publicPage")} →
          </Link>
        </section>

        <section className={CARD} aria-labelledby="certs">
          <h2 id="certs" className="text-sm font-bold text-navy-900">{t("certs")}</h2>
          {me.certificates.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("certsEmpty")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {me.certificates.map((cert) => (
                <li key={cert.number} className="rounded-xl border border-line p-3">
                  <p className="font-bold text-navy-900">{cert.trade}</p>
                  <p className="text-sm tabular-nums text-muted">
                    {cert.number} · {cert.issued_at ?? "—"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-warning-600">{t("signatures", { done: cert.signed, all: cert.expected })}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={`/api/v1/public/verify/${cert.number}/pdf?lang=${locale}`} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary" })}>
                      {t("pdf")}
                    </a>
                    <Link href={`/verify/${cert.number}`} className={buttonClass({ variant: "ghost" })}>
                      {t("check")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={CARD} aria-labelledby="jobs">
        <h2 id="jobs" className="text-sm font-bold text-navy-900">{t("jobs")}</h2>
        {me.placements.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("jobsEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {me.placements.map((job, index) => (
              <li key={index} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <span className="font-bold text-navy-900">{job.employer}</span>
                <span className="tabular-nums text-muted">
                  {job.start_date} – {job.end_date ?? t("now")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
