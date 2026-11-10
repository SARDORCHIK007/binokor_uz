import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Posting = {
  id: string;
  trade: string;
  quantity: number;
  status: string;
  location: string | null;
  created_at: string;
  counts: Record<string, number>;
};

export default async function PostingsPage() {
  const t = await getTranslations("postings");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const items = await apiAuth<Posting[]>(`/api/v1/employers/postings?lang=${locale}`);
  if (!items) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
          <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
        </div>
        <Link href="/kabinet/ishberuvchi" className={buttonClass()}>
          + {t("new")}
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => {
            const waiting = item.counts.PROPOSED ?? 0;
            const accepted = (item.counts.WORKER_ACCEPTED ?? 0) + (item.counts.EMPLOYER_APPROVED ?? 0) + (item.counts.HIRED ?? 0);
            const declined = (item.counts.WORKER_DECLINED ?? 0) + (item.counts.EMPLOYER_REJECTED ?? 0);
            const any = waiting + accepted + declined > 0;
            return (
              <li key={item.id} className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold text-navy-900">{item.trade}</p>
                    <p className="text-sm text-muted">
                      {t("quantity", { n: item.quantity })}
                      {item.location ? ` · ${item.location}` : ""} · <span className="tabular-nums">{item.created_at}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-primary">{t(`status.${item.status}` as "status.NEW")}</span>
                </div>
                {any ? (
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-amber-100 p-2">
                      <dd className="text-xl font-extrabold text-warning-600 tabular-nums">{waiting}</dd>
                      <dt className="text-xs text-muted">{t("waiting")}</dt>
                    </div>
                    <div className="rounded-xl bg-success-100 p-2">
                      <dd className="text-xl font-extrabold text-success-600 tabular-nums">{accepted}</dd>
                      <dt className="text-xs text-muted">{t("accepted")}</dt>
                    </div>
                    <div className="rounded-xl bg-danger-100 p-2">
                      <dd className="text-xl font-extrabold text-danger-600 tabular-nums">{declined}</dd>
                      <dt className="text-xs text-muted">{t("declined")}</dt>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-muted">{t("none")}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
