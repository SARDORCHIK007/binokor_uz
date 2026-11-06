import { buttonClass, EmptyState, ServiceCard, StatusBadge, type StatusTone } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { apiGet, type HomePayload } from "@/lib/public";
import { BuildingPoster } from "../BuildingPoster";

const serviceLinks = [
  { href: "/ariza", title: "apply", text: "applyText" },
  { href: "/ustalar", title: "verify", text: "verifyText" },
  { href: "/ustalar", title: "order", text: "orderText" },
  { href: "/ustalar", title: "brigade", text: "brigadeText" },
  { href: "/materiallar", title: "materials", text: "materialsText" },
  { href: "/obyektlar", title: "objects", text: "objectsText" },
] as const;

const steps = ["mahalla", "study", "certificate", "work"] as const;

const balance = ["langOnly", "tradeOnly", "neither", "both"] as const;

const partnerTone: Record<HomePayload["partners"][number]["status"], StatusTone> = {
  SIGNED: "success",
  NEGOTIATING: "warning",
  PLANNED: "info",
  ENDED: "danger",
};

const partnerLabel = {
  SIGNED: "signed",
  NEGOTIATING: "negotiating",
  PLANNED: "planned",
  ENDED: "planned",
} as const;

export async function HomePage() {
  const t = await getTranslations();
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  if (!home) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </div>
    );
  }
  const stats = [
    ["listeners", home.stats.listeners],
    ["certified", home.stats.certified],
    ["employed", home.stats.employed],
    ["sites", home.stats.sites],
  ] as const;
  return (
    <div>
      <section className="bg-canvas">
        <div className="mx-auto grid min-h-[88vh] max-w-[1200px] items-center gap-8 px-4 py-10 lg:grid-cols-2">
          <div>
            <h1 className="max-w-[18ch] text-4xl leading-tight font-bold text-navy-900 sm:text-5xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-4 max-w-[62ch] text-lg text-muted">{t("home.heroText")}</p>
            <form id="qidiruv" action="/qidiruv" className="mt-6 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="q">
                {t("home.searchLabel")}
              </label>
              <input
                id="q"
                name="q"
                placeholder={t("home.searchPlaceholder")}
                className="min-h-12 flex-1 rounded-sm border border-line bg-card px-4 text-base focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
              />
              <button className={buttonClass({ size: "lg" })} type="submit">
                {t("home.searchAction")}
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/ariza" className={buttonClass({ size: "lg" })}>
                {t("home.apply")}
              </Link>
              <Link href="/verify/UB-2026-000123" className={buttonClass({ variant: "secondary", size: "lg" })}>
                {t("home.findWorker")}
              </Link>
            </div>
          </div>
          <BuildingPoster caption={t("home.posterCaption")} />
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14" aria-labelledby="xizmatlar">
        <h2 id="xizmatlar" className="text-3xl font-semibold text-navy-900">
          {t("home.servicesTitle")}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceLinks.map((item) => (
            <Link key={item.title} href={item.href} className="group rounded-md focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none">
              <ServiceCard title={t(`services.${item.title}`)} text={t(`services.${item.text}`)} icon={<span aria-hidden="true">▣</span>} />
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-card py-14" aria-labelledby="raqamlar">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 id="raqamlar" className="text-3xl font-semibold text-navy-900">
            {t("home.statsTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("home.statsNote")}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(([key, value]) => (
              <div key={key} className="rounded-md border border-line bg-canvas p-4 shadow-sh1">
                <dt className="text-sm text-muted">{t(`home.${key}`)}</dt>
                <dd className="mt-2 text-4xl font-bold text-navy-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="loyiha" className="mx-auto max-w-[1200px] px-4 py-14">
        <h2 className="text-3xl font-semibold text-navy-900">{t("home.modelTitle")}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step} className="rounded-md border border-line bg-card p-4 shadow-sh1">
              <p className="text-sm font-medium text-primary tabular-nums">0{index + 1}</p>
              <h3 className="mt-2 text-xl font-semibold">{t(`steps.${step}`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`steps.${step}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="balans" className="bg-blue-50 py-14">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 className="text-3xl font-semibold text-navy-900">{t("home.balanceTitle")}</h2>
          <p className="mt-2 max-w-[62ch] text-base text-muted">{t("home.balanceText")}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {balance.map((item) => (
              <article key={item} className="rounded-md bg-card p-5 shadow-sh1">
                <h3 className="text-xl font-semibold">{t(`balance.${item}`)}</h3>
                <p className="mt-2 text-base text-muted">{t(`balance.${item}Text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="kasblar" className="mx-auto max-w-[1200px] px-4 py-14">
        <h2 className="text-3xl font-semibold text-navy-900">{t("home.tradesTitle")}</h2>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {home.trades.map((trade) => (
            <Link key={trade.code} href={`/kasblar/${trade.code}`} className="w-56 shrink-0 rounded-md border border-line bg-card p-4 shadow-sh1">
              <div className="flex size-12 items-center justify-center rounded-sm bg-teal-100 text-sm font-bold text-teal-700">
                {trade.name.slice(0, 1)}
              </div>
              <h3 className="mt-3 text-lg font-semibold">{trade.name}</h3>
              <p className="mt-2 text-sm text-muted">
                {t("home.domestic")}: {trade.domestic_months} {t("home.months")}
              </p>
              <p className="text-sm text-muted">
                {t("home.foreign")}: {trade.domestic_months + trade.foreign_lang_months} {t("home.months")}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-card py-14">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 className="text-3xl font-semibold text-navy-900">{t("home.uychiTitle")}</h2>
          <p className="mt-2 max-w-[62ch] text-muted">{t("home.uychiText")}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {["#1c3a66", "#2563a8", "#2f7d6d"].map((color) => (
              <div key={color} className="h-40 rounded-md" style={{ background: color }} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-14">
        <h2 className="text-3xl font-semibold text-navy-900">{t("home.destinationsTitle")}</h2>
        <p className="mt-2 max-w-[62ch] text-muted">{t("home.destinationsText")}</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {home.destinations.map((item) => (
            <li key={item.code} className="rounded-md border border-line bg-card p-4">
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-muted">{item.language}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line bg-canvas py-14">
        <div className="mx-auto max-w-[1200px] px-4">
          <h2 className="text-3xl font-semibold text-navy-900">{t("home.partnersTitle")}</h2>
          <p className="mt-2 max-w-[62ch] text-muted">{t("home.partnersText")}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {home.partners.map((partner) => (
              <li key={partner.name} className="rounded-md border border-line bg-card p-4">
                <p className={`mb-3 ${partner.show_logo ? "text-lg font-bold text-navy-900" : "text-base font-semibold text-ink"}`}>
                  {partner.name}
                </p>
                <StatusBadge tone={partnerTone[partner.status]}>{t(`partners.${partnerLabel[partner.status]}`)}</StatusBadge>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
