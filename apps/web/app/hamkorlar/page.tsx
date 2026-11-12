import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { Flag } from "@/components/Flag";
import { ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { partnerLogo } from "@/lib/partnerLogo";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

type Partner = HomePayload["partners"][number];
const STATUSES = ["SIGNED", "NEGOTIATING", "PLANNED", "ENDED"] as const;
const BADGE: Record<Partner["status"], string> = {
  SIGNED: "bg-success-100 text-success-600",
  NEGOTIATING: "bg-warning-100 text-warning-600",
  PLANNED: "bg-blue-100 text-primary",
  ENDED: "bg-danger-100 text-danger-600",
};

export default async function PartnersPage() {
  const t = await getTranslations("partnersPage");
  const countries = await getTranslations("countries");
  const countryLangs = await getTranslations("countryLangs");
  const states = await getTranslations("states");
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  if (!home) {
    return (
      <ErrorPage>
        <EmptyState title={states("errorTitle")} text={states("errorText")} />
      </ErrorPage>
    );
  }
  const used = new Set(home.partners.map((partner) => partner.status));
  return (
    <div className={PAGE}>
      <PageHeader title={t("title")} text={t("lead")} />

      <section className="mb-8 grid gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <Icon name="shield" className="size-5 text-primary" />
            {t("whatTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-body">{t("whatText")}</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">{t("rule")}</p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-navy-900">{t("statusTitle")}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {STATUSES.filter((status) => used.has(status)).map((status) => (
              <li key={status} className="flex items-start gap-2 text-xs text-body">
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${BADGE[status]}`}>{t(`status.${status}`)}</span>
                <span className="pt-0.5">{t(`statusHelp.${status}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {home.partners.map((partner) => {
          const logo = partnerLogo(partner.slug);
          return (
            <li key={partner.name} className="flex flex-col rounded-2xl border border-line bg-card p-5 shadow-sh1">
              <div className="grid h-32 place-items-center rounded-xl bg-canvas p-3">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={partner.name} className="h-24 w-auto max-w-[85%] object-contain" />
                ) : (
                  <Icon name="shield" className="size-9 text-faint" />
                )}
              </div>
              <p className="mt-4 text-[11px] font-bold tracking-wider text-primary uppercase">{t(`kind.${partner.kind}`)}</p>
              <h2 className="mt-1 text-base leading-snug font-bold text-navy-900">
                {partner.slug ? (
                  <Link href={`/hamkorlar/${partner.slug}`} className="hover:text-primary">
                    {partner.name}
                  </Link>
                ) : (
                  partner.name
                )}
              </h2>
              {partner.role ? <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{partner.role}</p> : <span className="flex-1" />}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[partner.status]}`}>{t(`status.${partner.status}`)}</span>
                {partner.signed_at ? <span className="text-xs text-muted">{t("since", { date: partner.signed_at })}</span> : null}
              </div>
              {partner.slug ? (
                <Link href={`/hamkorlar/${partner.slug}`} className="mt-3 text-sm font-bold text-primary hover:underline">
                  {t("open")} →
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>

      {home.destinations.length > 0 ? (
        <section className="mt-10" aria-labelledby="countries">
          <h2 id="countries" className="text-2xl font-extrabold text-navy-900">{t("countriesTitle")}</h2>
          <p className="mt-1 max-w-[70ch] text-sm text-muted">{t("countriesText")}</p>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {home.destinations.map((item) => (
              <li key={item.code} className="flex flex-col items-center rounded-2xl border border-line bg-card p-5 text-center shadow-sh1">
                <Flag code={item.code} className="size-14" />
                <p className="mt-3 text-base font-extrabold text-navy-900">{countries.has(item.code as "KR") ? countries(item.code as "KR") : item.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-muted">
                  {countryLangs.has(item.code as "KR") ? countryLangs(item.code as "KR") : item.language}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-navy-900">{t("join")}</h2>
          <p className="mt-1 text-sm text-muted">{t("joinText")}</p>
        </div>
        <Link href="/aloqa" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover">
          {t("contact")}
        </Link>
      </section>
    </div>
  );
}
