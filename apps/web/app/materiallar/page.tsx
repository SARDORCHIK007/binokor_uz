import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { Marketplace, type MarketPage } from "@/components/market/Marketplace";
import { ErrorPage } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const t = await getTranslations("market");
  const states = await getTranslations("states");
  const nav = await getTranslations("nav");
  const data = await apiGet<MarketPage>("/api/v1/public/market?limit=12&sort=featured");
  if (!data) {
    return (
      <ErrorPage>
        <EmptyState title={states("errorTitle")} text={states("errorText")} />
      </ErrorPage>
    );
  }
  const perks = [
    { icon: "factory" as const, text: t("perk1") },
    { icon: "users" as const, text: t("perk2") },
    { icon: "truck" as const, text: t("perk3") },
  ];
  const stats = [
    { value: data.total, label: t("statProducts") },
    { value: data.facets.producers.length, label: t("statProducers") },
    { value: data.facets.categories.length, label: t("statCategories") },
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <nav aria-label="breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">{nav("home")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <span className="font-semibold text-navy-900">{t("title")}</span>
      </nav>

      {/* Hero: Uychi brand + materials photo */}
      <section className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-card shadow-sh2">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-accent" aria-hidden="true" />
        <div className="grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1.15fr] lg:p-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-accent">
              <Icon name="factory" className="size-4" />
              {t("eyebrow")}
            </span>
            <h1 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight text-navy-900 sm:text-4xl lg:text-[44px]">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-[56ch] text-base leading-relaxed text-muted">{t("text")}</p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {perks.map((perk) => (
                <li key={perk.text} className="flex items-center gap-3 text-sm font-semibold text-navy-900">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-primary">
                    <Icon name={perk.icon} className="size-4" />
                  </span>
                  {perk.text}
                </li>
              ))}
            </ul>
            <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-line bg-canvas px-3 py-2.5">
                  <dd className="text-2xl font-extrabold tabular-nums text-navy-900">{stat.value}</dd>
                  <dt className="text-[11px] leading-tight font-semibold text-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
            <a href="#katalog" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover">
              {t("browse")}
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-x-6 bottom-2 h-1/2 rounded-full bg-blue-100 blur-2xl" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/misc/materials-hero.webp"
              alt={t("heroAlt")}
              width={1400}
              height={788}
              fetchPriority="high"
              className="relative h-auto w-full object-contain"
            />
          </div>
        </div>
      </section>

      {/* Producers strip */}
      <section className="mt-8" aria-labelledby="producers-title">
        <h2 id="producers-title" className="text-lg font-bold text-navy-900">{t("producers")}</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.facets.producers.map((producer) => (
            <li key={producer.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-sh1">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-accent">
                <Icon name="factory" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy-900">{producer.name}</p>
                <p className="truncate text-xs text-muted">
                  {producer.address} · {t("productsCount", { count: producer.count })}
                </p>
              </div>
              {producer.verified ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-bold text-success-600">
                  <Icon name="check" className="size-3" /> {t("verified")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <Marketplace initial={data} />
      </div>
    </div>
  );
}
