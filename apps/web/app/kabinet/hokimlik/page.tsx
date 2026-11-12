import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Badge, CARD, Meter, PageHead, Tile, type Tone } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Overview = {
  kpi: Record<string, number | null>;
  funnel: { key: string; value: number }[];
  mahallas: { name: string; people: number; studying: number; certified: number; employed: number }[];
  covered: number;
  monthly: { month: string; applications: number; certificates: number }[];
  objects: { name: string; status: string; progress: number }[];
  partners: { name: string; kind: string; status: string; slug: string | null }[];
  alerts: Record<string, number>;
};

const ALERT_LINK: Record<string, string | null> = {
  awaiting_signature: "/kabinet/imzolash",
  at_risk: "/kabinet/monitoring/tinglovchilar",
  uncovered_mahallas: "/kabinet/mahallalar",
  vacancies_without_candidates: null,
  partners_pending: "/hamkorlar",
};
const PARTNER_TONE: Record<string, Tone> = { SIGNED: "green", NEGOTIATING: "amber", PLANNED: "blue", ENDED: "red" };

export default async function DistrictPage() {
  const t = await getTranslations("hk");
  const partnersT = await getTranslations("partnersPage");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const data = await apiAuth<Overview>(`/api/v1/district/overview?lang=${locale}`);
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  const { kpi } = data;
  const num = (key: string) => kpi[key] ?? 0;
  const alerts = Object.entries(data.alerts).filter(([, value]) => value > 0);
  const peak = Math.max(1, ...data.funnel.map((step) => step.value));
  const monthPeak = Math.max(1, ...data.monthly.flatMap((item) => [item.applications, item.certificates]));
  const top = data.mahallas.slice(0, 10);
  const mahallaPeak = Math.max(1, ...top.map((item) => item.people));
  const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={t("title")}
        text={t("text")}
        actions={
          <div className="flex flex-wrap gap-2">
            {([["/kabinet/imzolash", "sign"], ["/kabinet/hisobot", "report"], ["/kabinet/mahallalar", "mahallas"], ["/kabinet/monitoring", "monitoring"]] as const).map(([href, key]) => (
              <Link key={key} href={href} className="rounded-xl border border-line-strong bg-card px-4 py-2 text-sm font-bold text-navy-900 hover:border-primary hover:text-primary">
                {t(`link.${key}`)}
              </Link>
            ))}
          </div>
        }
      />

      <section className={CARD} aria-labelledby="alerts">
        <h2 id="alerts" className="text-lg font-extrabold text-navy-900">{t("alertsTitle")}</h2>
        {alerts.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-success-600">✓ {t("noAlerts")}</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {alerts.map(([key, value]) => {
              const href = ALERT_LINK[key];
              const body = (
                <span className="flex items-center gap-3 rounded-xl border border-warning-600/30 bg-warning-100 px-4 py-3 text-sm font-semibold text-navy-900">
                  <span aria-hidden="true">⚠</span>
                  {t(`alert.${key}` as "alert.at_risk", { n: value })}
                </span>
              );
              return <li key={key}>{href ? <Link href={href} className="block transition hover:opacity-80">{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label={t("kpi.applicants")} value={num("applicants")} tone="blue" />
        <Tile label={t("kpi.studying")} value={num("studying")} tone="blue" />
        <Tile label={t("kpi.certified")} value={num("certified")} tone="green" />
        <Tile label={t("kpi.employed")} value={num("employed")} tone="green" />
        <Tile label={t("kpi.abroad")} value={num("abroad")} tone="amber" />
        <Tile label={t("kpi.vacancies")} value={num("open_local") + num("open_foreign")} tone="amber" hint={t("kpi.vacanciesHint", { local: num("open_local"), foreign: num("open_foreign") })} />
        <Tile label={t("kpi.covered")} value={`${data.covered}/${num("mahallas")}`} tone={data.covered < num("mahallas") ? "amber" : "green"} />
        <Tile label={t("quality.attendance")} value={pct(kpi.attendance ?? null)} tone={kpi.attendance !== null && (kpi.attendance ?? 100) < 80 ? "red" : "green"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={CARD} aria-labelledby="funnel">
          <h2 id="funnel" className="text-lg font-extrabold text-navy-900">{t("funnelTitle")}</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {data.funnel.map((step) => (
              <li key={step.key} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate font-semibold text-navy-900">{t(`funnel.${step.key}` as "funnel.applicants")}</span>
                <Meter value={(100 * step.value) / peak} label={step.key} />
                <span className="text-right font-bold text-navy-900 tabular-nums">{step.value}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={CARD} aria-labelledby="monthly">
          <h2 id="monthly" className="text-lg font-extrabold text-navy-900">{t("monthlyTitle")}</h2>
          <div className="mt-4 flex h-44 items-end gap-3" role="img" aria-label={t("monthlyTitle")}>
            {data.monthly.map((item) => (
              <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <span className="w-1/2 max-w-6 rounded-t bg-primary" style={{ height: `${(100 * item.applications) / monthPeak}%`, minHeight: item.applications ? 4 : 0 }} title={`${t("monthly.applications")}: ${item.applications}`} />
                  <span className="w-1/2 max-w-6 rounded-t bg-success-600" style={{ height: `${(100 * item.certificates) / monthPeak}%`, minHeight: item.certificates ? 4 : 0 }} title={`${t("monthly.certificates")}: ${item.certificates}`} />
                </div>
                <span className="text-[11px] font-semibold text-muted tabular-nums">{item.month.slice(5)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex gap-4 text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />{t("monthly.applications")}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success-600" />{t("monthly.certificates")}</span>
          </p>
        </section>
      </div>

      <section className={CARD} aria-labelledby="mahallas">
        <h2 id="mahallas" className="text-lg font-extrabold text-navy-900">{t("mahallaTitle")}</h2>
        <p className="mt-1 text-xs text-muted">{t("mahallaText", { n: top.length })}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 font-semibold" />
                <th className="py-2 pr-4 font-semibold">{t("col.people")}</th>
                <th className="py-2 text-right font-semibold">{t("col.studying")}</th>
                <th className="py-2 text-right font-semibold">{t("col.certified")}</th>
                <th className="py-2 text-right font-semibold">{t("col.employed")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {top.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="py-2 pr-3 text-left font-bold text-navy-900">{row.name}</th>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="w-24 shrink-0"><Meter value={(100 * row.people) / mahallaPeak} label={row.name} /></span>
                      <span className="font-bold tabular-nums text-navy-900">{row.people}</span>
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{row.studying}</td>
                  <td className="py-2 text-right tabular-nums">{row.certified}</td>
                  <td className="py-2 text-right tabular-nums">{row.employed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={CARD} aria-labelledby="quality">
          <h2 id="quality" className="text-lg font-extrabold text-navy-900">{t("qualityTitle")}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([["attendance", pct(kpi.attendance ?? null)], ["score", kpi.score ?? "—"], ["pass_rate", pct(kpi.pass_rate ?? null)], ["teachers", num("teachers")], ["groups", num("groups")]] as const).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-line bg-surface-100 p-3">
                <dd className="text-2xl font-extrabold text-navy-900 tabular-nums">{value}</dd>
                <dt className="text-xs font-semibold text-muted">{t(`quality.${key}`)}</dt>
              </div>
            ))}
          </dl>
        </section>

        <section className={CARD} aria-labelledby="objects">
          <h2 id="objects" className="text-lg font-extrabold text-navy-900">{t("objectsTitle")}</h2>
          {data.objects.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noObjects")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {data.objects.map((item) => (
                <li key={item.name}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-navy-900">{item.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge tone={item.status === "COMPLETED" ? "green" : item.status === "PAUSED" ? "red" : "blue"}>{t(`objStatus.${item.status}` as "objStatus.PLANNED")}</Badge>
                      <span className="w-10 text-right font-bold tabular-nums text-navy-900">{item.progress}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Meter value={item.progress} tone="green" label={item.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={CARD} aria-labelledby="partners">
        <h2 id="partners" className="text-lg font-extrabold text-navy-900">{t("partnersTitle")}</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.partners.map((partner) => (
            <li key={partner.name} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-100 p-3">
              <span className="min-w-0">
                {partner.slug ? (
                  <Link href={`/hamkorlar/${partner.slug}`} className="block truncate text-sm font-bold text-navy-900 hover:text-primary">{partner.name}</Link>
                ) : (
                  <span className="block truncate text-sm font-bold text-navy-900">{partner.name}</span>
                )}
                <span className="text-xs text-muted">{partnersT(`kind.${partner.kind}` as "kind.GOV")}</span>
              </span>
              <Badge tone={PARTNER_TONE[partner.status] ?? "gray"}>{partnersT(`status.${partner.status}` as "status.SIGNED")}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
