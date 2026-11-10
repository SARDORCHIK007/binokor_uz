import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon, type IconName } from "@/components/brand/Icon";
import { CARD, ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

const AUDIENCE: IconName[] = ["cap", "briefcase", "users", "factory"];
const STEPS: { key: "s1" | "s2" | "s3" | "s4" | "s5"; icon: IconName }[] = [
  { key: "s1", icon: "doc" },
  { key: "s2", icon: "users" },
  { key: "s3", icon: "book" },
  { key: "s4", icon: "award" },
  { key: "s5", icon: "briefcase" },
];
const TRACKS = [
  ["langOnly", "langOnlyText"],
  ["tradeOnly", "tradeOnlyText"],
  ["neither", "neitherText"],
  ["both", "bothText"],
] as const;
const BADGE = {
  SIGNED: "bg-success-100 text-success-600",
  NEGOTIATING: "bg-warning-100 text-warning-600",
  PLANNED: "bg-blue-100 text-primary",
  ENDED: "bg-danger-100 text-danger-600",
} as const;

export default async function ProjectPage() {
  const t = await getTranslations("project");
  const landing = await getTranslations("landing");
  const balance = await getTranslations("balance");
  const partnersT = await getTranslations("partnersPage");
  const states = await getTranslations("states");
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  if (!home) {
    return (
      <ErrorPage>
        <EmptyState title={states("errorTitle")} text={states("errorText")} />
      </ErrorPage>
    );
  }
  const stats = [
    { label: landing("stat.applicants"), value: home.stats.applicants ?? 0 },
    { label: landing("stat.listeners"), value: home.stats.listeners ?? 0 },
    { label: landing("stat.certified"), value: home.stats.certified ?? 0 },
    { label: landing("stat.employed"), value: home.stats.employed ?? 0 },
    { label: t("statTrades"), value: home.trades.length },
    { label: t("statPartners"), value: home.partners.length },
  ];
  const faq = ["1", "2", "3", "4"] as const;

  return (
    <article className={PAGE}>
      <PageHeader title={t("title")} text={t("lead")} />

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="goal">
        <div className={`${CARD} p-6 sm:p-8`}>
          <h2 id="goal" className="text-2xl font-extrabold text-navy-900">{t("goalTitle")}</h2>
          <p className="mt-3 leading-relaxed text-body">{t("goalText")}</p>
        </div>
        <div className={`${CARD} p-6`}>
          <h2 className="text-lg font-extrabold text-navy-900">{t("forTitle")}</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {AUDIENCE.map((icon, index) => (
              <li key={icon} className="flex items-start gap-3 text-sm font-semibold text-navy-900">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-primary">
                  <Icon name={icon} className="size-4" />
                </span>
                <span className="pt-1">{t(`for${index + 1}` as "for1")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="stats">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="stats" className="text-2xl font-extrabold text-navy-900">{t("statsTitle")}</h2>
          <p className="text-xs text-muted">{t("statsNote")}</p>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <div key={stat.label} className={CARD}>
              <dd className="text-3xl font-extrabold text-navy-900 tabular-nums">{stat.value.toLocaleString("ru-RU")}</dd>
              <dt className="mt-1 text-xs font-semibold text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10" aria-labelledby="steps">
        <h2 id="steps" className="text-2xl font-extrabold text-navy-900">{t("stepsTitle")}</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step.key} className={`${CARD} relative`}>
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
                <Icon name={step.icon} className="size-5" />
              </span>
              <p className="mt-3 text-xs font-bold tracking-wider text-primary uppercase">{index + 1}</p>
              <h3 className="mt-0.5 text-lg font-extrabold text-navy-900">{t(`${step.key}t`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(step.key)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2" aria-labelledby="duration">
        <div className={`${CARD} p-6`}>
          <h2 id="duration" className="text-xl font-extrabold text-navy-900">{t("durationTitle")}</h2>
          <p className="mt-3 text-5xl font-extrabold text-primary tabular-nums">6–12</p>
          <p className="mt-1 text-sm font-semibold text-muted">{t("durationText")}</p>
          <p className="mt-4 rounded-xl bg-warning-100 p-3 text-sm font-semibold text-navy-900">{t("durationFast")}</p>
        </div>
        <div className={`${CARD} p-6`}>
          <h2 className="text-xl font-extrabold text-navy-900">{t("tracksTitle")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {TRACKS.map(([title, text]) => (
              <li key={title} className="rounded-xl border border-line bg-surface-100 p-3">
                <p className="text-sm font-bold text-navy-900">{balance(title)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{balance(text)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className={`${CARD} p-6`} aria-labelledby="req">
          <h2 id="req" className="text-xl font-extrabold text-navy-900">{t("reqTitle")}</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {(["req1", "req2", "req3", "req4", "req5"] as const).map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm font-semibold text-navy-900">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-600 text-white">
                  <Icon name="check" className="size-3.5" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <div className={`${CARD} p-6`}>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-navy-900">
            <Icon name="shield" className="size-5 text-primary" />
            {t("trustTitle")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-body">{t("trustText")}</p>
          <Link href="/qidiruv" className={`${buttonClass({ variant: "secondary" })} mt-4`}>
            {t("ctaVerify")} →
          </Link>
        </div>
      </section>

      <section className={`${CARD} mt-10 p-6 sm:p-8`} aria-labelledby="work">
        <h2 id="work" className="text-2xl font-extrabold text-navy-900">{t("employmentTitle")}</h2>
        <p className="mt-3 max-w-[80ch] leading-relaxed text-body">{t("employmentText")}</p>
      </section>

      <section className="mt-10" aria-labelledby="partners">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="partners" className="text-2xl font-extrabold text-navy-900">{t("partnersTitle")}</h2>
          <Link href="/hamkorlar" className="text-sm font-bold text-primary hover:underline">{t("partnersAll")} →</Link>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {home.partners.map((partner) => (
            <li key={partner.name} className={CARD}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-extrabold text-navy-900">{partner.name}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[partner.status]}`}>
                  {partnersT(`status.${partner.status}`)}
                </span>
              </div>
              {partner.role ? <p className="mt-2 text-sm leading-relaxed text-muted">{partner.role}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-extrabold text-navy-900">{t("faqTitle")}</h2>
        <div className="mt-4 flex flex-col gap-3">
          {faq.map((n) => (
            <details key={n} className="group rounded-2xl border border-line bg-card px-5 py-4 shadow-sh1">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-navy-900">
                {t(`q${n}`)}
                <span aria-hidden="true" className="text-muted transition group-open:rotate-180">⌄</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t(`a${n}`)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl bg-navy-900 p-8 text-center text-white">
        <h2 className="text-2xl font-extrabold">{t("ctaTitle")}</h2>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/ariza" className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-navy-900 hover:bg-accent-hover">
            {t("ctaApply")}
          </Link>
          <Link href="/qidiruv" className="rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
            {t("ctaVerify")}
          </Link>
        </div>
      </section>
    </article>
  );
}
