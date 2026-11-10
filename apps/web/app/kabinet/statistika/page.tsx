import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Stats = {
  by_status: Record<string, number>;
  months: { month: string; orders: number; total: number }[];
  top: { name: string; orders: number; quantity: number; unit: string }[];
  products: number;
  out_of_stock: number;
};

const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6";

function money(value: number): string {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default async function ProducerStatsPage() {
  const t = await getTranslations("producerStats");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const stats = await apiAuth<Stats>(`/api/v1/producers/stats?lang=${locale}`);
  if (!stats) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const total = Object.values(stats.by_status).reduce((sum, n) => sum + n, 0);
  const peak = Math.max(1, ...stats.months.map((m) => m.orders));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          [t("products"), stats.products],
          [t("outOfStock"), stats.out_of_stock],
          [t("statusTitle"), total],
        ].map(([label, value]) => (
          <div key={String(label)} className={CARD}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-3xl font-extrabold text-navy-900 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {total === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          <section className={CARD}>
            <h2 className="text-sm font-bold text-navy-900">{t("statusTitle")}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {Object.entries(stats.by_status).map(([status, n]) => (
                <li key={status} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-sm">
                  <span className="font-semibold text-navy-900">{t(`status.${status}` as "status.NEW")}</span>
                  <span className="font-bold tabular-nums text-primary">{n}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className={CARD}>
            <h2 className="text-sm font-bold text-navy-900">{t("monthsTitle")}</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {stats.months.map((m) => (
                <li key={m.month} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-navy-900 tabular-nums">{m.month}</span>
                    <span className="text-muted">
                      {t("orders", { n: m.orders })}
                      {m.total > 0 ? ` · ${t("sum", { n: money(m.total) })}` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-blue-100">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((100 * m.orders) / peak)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className={`${CARD} xl:col-span-2`}>
            <h2 className="text-sm font-bold text-navy-900">{t("topTitle")}</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {stats.top.map((item) => (
                <li key={item.name} className="flex justify-between gap-3 py-2.5">
                  <span className="font-semibold text-navy-900">{item.name}</span>
                  <span className="tabular-nums text-muted">
                    {t("orders", { n: item.orders })} · {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
