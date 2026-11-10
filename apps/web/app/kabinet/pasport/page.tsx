import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ShareButtons } from "@/components/ShareButtons";
import { PassportPhoto } from "@/components/cabinet/PassportPhoto";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Passport =
  | { enrolled: false }
  | {
      enrolled: true;
      has_photo: boolean;
      id: string;
      number: string;
      name: string;
      trade: string;
      group: string;
      status: string;
      enrolled_at: string;
      fingerprint: string;
    };

const LANGS = [
  ["uz-Latn", "UZ"],
  ["uz-Cyrl", "ЎЗ"],
  ["ru", "RU"],
  ["en", "EN"],
] as const;

export default async function PassportPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const query = await searchParams;
  const siteLocale = await getLocale();
  const lang = LANGS.some(([code]) => code === query.lang) ? (query.lang as string) : LANGS.some(([code]) => code === siteLocale) ? siteLocale : "uz-Latn";
  const t = await getTranslations("passportPage");
  const states = await getTranslations("states");
  const data = await apiAuth<Passport>(`/api/v1/me/passport?lang=${lang}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  if (!data.enrolled) {
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
  const rows = [
    [t("number"), data.number],
    [t("trade"), data.trade],
    [t("group"), data.group],
    [t("enrolled"), data.enrolled_at],
    [t("signature"), data.fingerprint],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[62ch] text-muted">{t("text")}</p>
      </div>
      <div role="group" aria-label={t("cardLang")} className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted">{t("cardLang")}:</span>
        {LANGS.map(([code, label]) => (
          <Link
            key={code}
            href={`/kabinet/pasport?lang=${code}`}
            hrefLang={code}
            aria-current={code === lang ? "true" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-bold ${code === lang ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-3xl bg-navy-900 p-2 shadow-sh3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/v1/me/passport/card.png?lang=${lang}`} alt={t("cardAlt")} width={1536} height={1024} className="h-auto w-full" />
        </div>
        <div className="flex flex-col gap-4">
          <dl className="divide-y divide-line rounded-2xl border border-line bg-card px-5 shadow-sh1">
            {rows.map(([term, value]) => (
              <div key={term} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <dt className="text-muted">{term}</dt>
                <dd className="font-bold text-navy-900 tabular-nums">{value}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-2 py-3 text-sm">
              <dt className="text-muted">{t("statusLabel")}</dt>
              <dd>
                <span className="rounded-full bg-success-100 px-2.5 py-1 text-xs font-bold text-success-600">
                  {t(`status.${data.status}` as "status.ACTIVE")}
                </span>
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3">
            <a href={`/api/v1/me/passport/card.png?lang=${lang}`} download="uychi-binokor-pasport.png" className={buttonClass()}>
              ⤓ {t("downloadPng")}
            </a>
            <a href={`/api/v1/me/passport/card.pdf?lang=${lang}`} target="_blank" rel="noopener" className={buttonClass({ variant: "secondary" })}>
              {t("downloadPdf")}
            </a>
            <Link href={`/pasport/${data.id}`} className={buttonClass({ variant: "ghost" })}>
              {t("openPublic")} →
            </Link>
          </div>
          <ShareButtons path={`/pasport/${data.id}`} title={t("shareTitle")} imageUrl={`/api/v1/me/passport/card.png?lang=${lang}`} />
          <PassportPhoto hasPhoto={data.has_photo} />
          <p className="text-xs text-muted">{t("photoNote")}</p>
        </div>
      </div>
    </div>
  );
}
