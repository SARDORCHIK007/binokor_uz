import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Flag } from "@/components/Flag";
import { CARD, ErrorPage, PAGE } from "@/components/site/PageHeader";
import { partnerLogo } from "@/lib/partnerLogo";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Profile = {
  slug: string;
  name: string;
  kind: "GOV" | "EDU" | "INTL" | "EMPLOYER" | "AGENCY" | "PRODUCER";
  status: "SIGNED" | "NEGOTIATING" | "PLANNED" | "ENDED";
  role: string;
  signed_at: string | null;
  show_logo: boolean;
  function: "coordination" | "education" | "employment" | "abroad" | "materials";
  signs: boolean;
  metrics: Record<string, number>;
  about: string;
  contacts: { website: string; email: string; phone: string; address: string };
  signed_certificates: number;
  recent_signed: { number: string; date: string }[];
  destinations: { code: string; name: string; language: string }[];
};

const BADGE = {
  SIGNED: "bg-success-100 text-success-600",
  NEGOTIATING: "bg-warning-100 text-warning-600",
  PLANNED: "bg-blue-100 text-primary",
  ENDED: "bg-danger-100 text-danger-600",
} as const;

const FUNCTION_ICON: Record<Profile["function"], IconName> = {
  coordination: "pin",
  education: "cap",
  employment: "briefcase",
  abroad: "globe",
  materials: "factory",
};

const FUNCTION_LINK: Record<Profile["function"], string> = {
  coordination: "/obyektlar",
  education: "/kasblar",
  employment: "/ustalar",
  abroad: "/yonalishlar",
  materials: "/materiallar",
};

export default async function PartnerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("partnerPage");
  const list = await getTranslations("partnersPage");
  const nav = await getTranslations("nav");
  const states = await getTranslations("states");
  const countries = await getTranslations("countries");
  const profile = await apiGet<Profile>(`/api/v1/public/partners/${slug}`);
  if (!profile) {
    return (
      <ErrorPage>
        <EmptyState title={states("errorTitle")} text={states("errorText")} />
      </ErrorPage>
    );
  }
  const logo = profile.show_logo ? partnerLogo(profile.slug) : null;
  const fn = profile.function;
  const metrics = Object.entries(profile.metrics);

  return (
    <article className={PAGE}>
      <nav aria-label="breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">{nav("home")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <Link href="/hamkorlar" className="hover:text-primary">{list("title")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <span className="font-semibold text-navy-900">{profile.name}</span>
      </nav>

      <header className={`${CARD} mt-5 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8`}>
        <div className="grid size-28 shrink-0 place-items-center rounded-2xl bg-blue-50">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={profile.name} className="h-20 w-auto max-w-[85%] object-contain" />
          ) : (
            <Icon name={FUNCTION_ICON[fn]} className="size-12 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-wider text-primary uppercase">{list(`kind.${profile.kind}`)}</p>
          <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight text-navy-900 sm:text-4xl">{profile.name}</h1>
          {profile.role ? <p className="mt-3 max-w-[70ch] leading-relaxed text-muted">{profile.role}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${BADGE[profile.status]}`}>{list(`status.${profile.status}`)}</span>
            <span className="text-sm text-muted">
              {profile.signed_at ? t("signedSince", { date: profile.signed_at }) : t("noDate")}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className={`${CARD} p-6`} aria-labelledby="function">
          <h2 id="function" className="flex items-center gap-2 text-xl font-extrabold text-navy-900">
            <Icon name={FUNCTION_ICON[fn]} className="size-5 text-primary" />
            {t(`fn.${fn}.title`)}
          </h2>
          <p className="mt-1 text-xs font-bold tracking-wider text-muted uppercase">{t("functionTitle")}</p>
          <ul className="mt-4 flex flex-col gap-3">
            {(["i1", "i2", "i3"] as const).map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm font-semibold text-navy-900">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-600 text-white">
                  <Icon name="check" className="size-3.5" />
                </span>
                {t(`fn.${fn}.${key}`)}
              </li>
            ))}
          </ul>
          <Link href={FUNCTION_LINK[fn]} className={`${buttonClass({ variant: "secondary" })} mt-5`}>
            {t(`link.${fn}`)} →
          </Link>
        </section>

        <section className={`${CARD} p-6`} aria-labelledby="figures">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="figures" className="text-xl font-extrabold text-navy-900">{t("figuresTitle")}</h2>
            <p className="text-xs text-muted">{t("figuresNote")}</p>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            {metrics.map(([key, value]) => (
              <div key={key} className="rounded-xl border border-line bg-surface-100 p-4">
                <dd className="text-3xl font-extrabold text-navy-900 tabular-nums">{value.toLocaleString("ru-RU")}</dd>
                <dt className="mt-1 text-xs font-semibold text-muted">{t(`metric.${key}` as "metric.mahallas")}</dt>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {profile.about ? (
        <section className={`${CARD} mt-5 p-6`} aria-labelledby="about">
          <h2 id="about" className="text-xl font-extrabold text-navy-900">{t("aboutTitle")}</h2>
          <p className="mt-3 max-w-[80ch] leading-relaxed whitespace-pre-line text-body">{profile.about}</p>
        </section>
      ) : null}

      {Object.values(profile.contacts).some(Boolean) ? (
        <section className={`${CARD} mt-5 p-6`} aria-labelledby="contacts">
          <h2 id="contacts" className="text-xl font-extrabold text-navy-900">{t("contactsTitle")}</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {profile.contacts.website ? (
              <div>
                <dt className="text-muted">Web</dt>
                <dd><a href={profile.contacts.website} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-primary hover:underline">{profile.contacts.website}</a></dd>
              </div>
            ) : null}
            {profile.contacts.email ? (
              <div>
                <dt className="text-muted">Email</dt>
                <dd><a href={`mailto:${profile.contacts.email}`} className="font-bold text-primary hover:underline">{profile.contacts.email}</a></dd>
              </div>
            ) : null}
            {profile.contacts.phone ? (
              <div>
                <dt className="text-muted">Tel</dt>
                <dd><a href={`tel:${profile.contacts.phone}`} className="font-bold text-navy-900 tabular-nums">{profile.contacts.phone}</a></dd>
              </div>
            ) : null}
            {profile.contacts.address ? (
              <div>
                <dt className="text-muted">{t("contactsTitle")}</dt>
                <dd className="font-bold text-navy-900">{profile.contacts.address}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className={`${CARD} mt-5 p-6`} aria-labelledby="signing">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[70ch]">
            <h2 id="signing" className="flex items-center gap-2 text-xl font-extrabold text-navy-900">
              <Icon name="shield" className="size-5 text-primary" />
              {t("signTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{profile.signs ? t("signYes") : t("signNo")}</p>
          </div>
          {profile.signs ? (
            <div className="rounded-xl bg-blue-50 px-5 py-3 text-center">
              <p className="text-3xl font-extrabold text-navy-900 tabular-nums">{profile.signed_certificates}</p>
              <p className="text-xs font-semibold text-muted">{t("signedCount")}</p>
            </div>
          ) : null}
        </div>
        {profile.signs ? (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-navy-900">{t("recentTitle")}</h3>
            {profile.recent_signed.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("recentEmpty")}</p>
            ) : (
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                {profile.recent_signed.map((item) => (
                  <li key={item.number} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <Link href={`/verify/${item.number}`} className="font-bold text-primary tabular-nums hover:underline">
                      {item.number}
                    </Link>
                    <time className="text-muted tabular-nums" dateTime={item.date}>{item.date}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </section>

      {profile.destinations.length > 0 ? (
        <section className="mt-5" aria-labelledby="dest">
          <h2 id="dest" className="text-xl font-extrabold text-navy-900">{t("destinationsTitle")}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {profile.destinations.map((item) => (
              <li key={item.code} className="flex flex-col items-center rounded-2xl border border-line bg-card p-5 text-center shadow-sh1">
                <Flag code={item.code} className="size-12" />
                <p className="mt-3 font-extrabold text-navy-900">{countries.has(item.code as "KR") ? countries(item.code as "KR") : item.name}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-5 shadow-sh1">
        <Link href="/hamkorlar" className="text-sm font-bold text-primary hover:underline">← {list("all")}</Link>
        <Link href="/hamkorlar/ariza" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover">
          {t("contact")}
        </Link>
      </section>
    </article>
  );
}
