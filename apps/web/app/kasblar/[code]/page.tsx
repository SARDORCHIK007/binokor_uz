import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { CARD, ErrorPage, PAGE } from "@/components/site/PageHeader";
import { tradeImage } from "@/lib/media";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Trade = {
  code: string;
  name: string;
  domestic_months: number;
  foreign_lang_months: number;
};

export default async function TradePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const t = await getTranslations();
  const trade = await apiGet<Trade>(`/api/v1/public/trades/${code}`);
  if (!trade) {
    return (
      <ErrorPage>
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </ErrorPage>
    );
  }
  const tracks = [
    { icon: "pin" as const, label: t("home.domestic"), months: trade.domestic_months },
    { icon: "globe" as const, label: t("home.foreign"), months: trade.domestic_months + trade.foreign_lang_months },
  ];
  return (
    <article className={PAGE}>
      <nav aria-label="breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">{t("nav.home")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <Link href="/kasblar" className="hover:text-primary">{t("nav.trades")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <span className="font-semibold text-navy-900">{trade.name}</span>
      </nav>

      <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-line bg-blue-50 shadow-sh1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tradeImage(trade.code)} alt={trade.name} className="h-72 w-full object-contain object-center p-4 sm:h-96 lg:h-full lg:max-h-[460px]" />
        </div>
        <div className={`${CARD} flex flex-col p-6 sm:p-8`}>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{trade.name}</h1>
          <p className="mt-3 leading-relaxed text-muted">{t("home.destinationsText")}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {tracks.map((track) => (
              <li key={track.label} className="rounded-xl border border-line bg-canvas p-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
                  <Icon name={track.icon} className="size-4 text-primary" />
                  {track.label}
                </span>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-navy-900">
                  {track.months} <span className="text-base font-semibold text-muted">{t("home.months")}</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            <Link href="/ariza" className={buttonClass({ size: "lg", className: "w-full sm:w-auto" })}>
              {t("home.apply")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
