import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/cabinet/ActionButton";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Offer = {
  id: string;
  status: string;
  employer: string;
  trade: string;
  location: string | null;
  start_date: string | null;
  duration_months: number | null;
  salary_from: number | null;
  salary_to: number | null;
  conditions: string | null;
};

function money(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default async function OffersPage() {
  const t = await getTranslations("offers");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const offers = await apiAuth<Offer[]>(`/api/v1/me/offers?lang=${locale}`);
  if (!offers) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
      </div>
      {offers.length === 0 ? (
        <EmptyState title={t("empty")} text={t("emptyText")} />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-navy-900">{offer.employer}</p>
                  <p className="text-sm font-semibold text-primary">{offer.trade}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-primary">
                  {t(`status.${offer.status}` as "status.PROPOSED")}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {offer.salary_from !== null || offer.salary_to !== null ? (
                  <div>
                    <dt className="text-muted">{t("salary")}</dt>
                    <dd className="font-bold text-navy-900 tabular-nums">
                      {[offer.salary_from, offer.salary_to].filter((v): v is number => v !== null).map(money).join(" – ")}
                    </dd>
                  </div>
                ) : null}
                {offer.start_date ? (
                  <div>
                    <dt className="text-muted">{t("start")}</dt>
                    <dd className="font-bold text-navy-900 tabular-nums">{offer.start_date}</dd>
                  </div>
                ) : null}
                {offer.location ? (
                  <div>
                    <dt className="text-muted">·</dt>
                    <dd className="font-bold text-navy-900">{offer.location}</dd>
                  </div>
                ) : null}
                {offer.duration_months ? (
                  <div>
                    <dt className="text-muted">·</dt>
                    <dd className="font-bold text-navy-900">{t("months", { n: offer.duration_months })}</dd>
                  </div>
                ) : null}
              </dl>
              {offer.conditions ? <p className="mt-3 text-sm text-body">{offer.conditions}</p> : null}
              {offer.status === "PROPOSED" ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <ActionButton url={`/api/v1/me/offers/${offer.id}/respond`} body={{ accept: true }} label={t("accept")} failed={t("failed")} />
                  <ActionButton url={`/api/v1/me/offers/${offer.id}/respond`} body={{ accept: false }} label={t("decline")} failed={t("failed")} variant="secondary" />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
