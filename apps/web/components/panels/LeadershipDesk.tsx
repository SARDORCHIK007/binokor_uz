"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, CARD, Meter, Tile } from "@/components/cabinet/kit";
import { send } from "@/lib/clientApi";

type Alerts = {
  diary: { group: string; mentor: string; held: number; missing: number }[];
  at_risk: { name: string; group: string; mentor: string; pct: number; lessons: number }[];
  group_sizes: { code: string; active: number; max: number; state: "under" | "over" }[];
  trend: { week: string; pct: number }[];
  homework: { group: string; tasks: number; done: number; students: number }[];
  certificates_waiting: number;
  risk_below: number;
};

export function LeadershipDesk() {
  const t = useTranslations("ld");
  const [data, setData] = useState<Alerts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void send<Alerts>("/api/v1/leadership/alerts", "GET").then((result) => {
      if (result.ok && result.data) setData(result.data);
      else setFailed(true);
    });
  }, []);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  const missingTotal = data.diary.reduce((sum, row) => sum + row.missing, 0);
  const gaps = data.diary.filter((row) => row.missing > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label={t("kpi.at_risk")} value={data.at_risk.length} tone={data.at_risk.length > 0 ? "red" : "green"} />
        <Tile label={t("kpi.diary")} value={missingTotal} tone={missingTotal > 0 ? "amber" : "green"} />
        <Tile label={t("kpi.sizes")} value={data.group_sizes.length} tone={data.group_sizes.length > 0 ? "amber" : "green"} />
        <Tile label={t("kpi.certs")} value={data.certificates_waiting} tone={data.certificates_waiting > 0 ? "blue" : "gray"} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/kabinet/sertifikatlar" className={buttonClass({ variant: "secondary" })}>{t("open")}</Link>
        <Link href="/kabinet/monitoring" className={buttonClass({ variant: "secondary" })}>{t("monitoring")}</Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={CARD} aria-labelledby="ld-trend">
          <h2 id="ld-trend" className="text-lg font-extrabold text-navy-900">{t("trend")}</h2>
          {data.trend.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noTrend")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {data.trend.map((point) => (
                <li key={point.week} className="grid grid-cols-[4rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className="text-muted tabular-nums">{point.week}</span>
                  <Meter value={point.pct} tone={point.pct >= data.risk_below ? "green" : "amber"} label={`${point.week} ${point.pct}%`} />
                  <span className="text-right font-bold text-navy-900 tabular-nums">{point.pct}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={CARD} aria-labelledby="ld-diary">
          <h2 id="ld-diary" className="text-lg font-extrabold text-navy-900">{t("diary")}</h2>
          <p className="mt-1 text-sm text-muted">{t("diaryText")}</p>
          {data.diary.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noDiary")}</p>
          ) : gaps.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-success-600">✓ {t("diaryOk")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {gaps.map((row) => (
                <li key={row.group} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-bold text-navy-900">{row.group}</p>
                    <p className="text-xs text-muted">{row.mentor}</p>
                  </div>
                  <Badge tone="amber">{t("diaryRow", { missing: row.missing, held: row.held })}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className={CARD} aria-labelledby="ld-risk">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ld-risk" className="text-lg font-extrabold text-navy-900">{t("atRisk", { n: data.risk_below })}</h2>
          {data.at_risk.length > 0 ? <a href="/api/v1/leadership/at-risk.csv" download className={buttonClass({ variant: "secondary" })}>{t("csv")}</a> : null}
        </div>
        {data.at_risk.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-success-600">✓ {t("noRisk")}</p>
        ) : (
          <ul className="mt-3 grid gap-x-6 divide-y divide-line lg:grid-cols-2">
            {data.at_risk.map((row, index) => (
              <li key={`${row.name}-${index}`} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-navy-900">{row.name}</p>
                  <p className="text-xs text-muted">{t("riskRow", { group: row.group, mentor: row.mentor, lessons: row.lessons })}</p>
                </div>
                <Badge tone={row.pct < 50 ? "red" : "amber"}>{row.pct}%</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={CARD} aria-labelledby="ld-sizes">
          <h2 id="ld-sizes" className="text-lg font-extrabold text-navy-900">{t("sizes")}</h2>
          {data.group_sizes.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-success-600">✓ {t("sizesOk")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.group_sizes.map((g) => (
                <li key={g.code} className="py-2 text-sm font-semibold text-navy-900">{g.state === "under" ? t("under", { code: g.code, n: g.active }) : t("over", { code: g.code, n: g.active })}</li>
              ))}
            </ul>
          )}
        </section>
        <section className={CARD} aria-labelledby="ld-hw">
          <h2 id="ld-hw" className="text-lg font-extrabold text-navy-900">{t("homework")}</h2>
          {data.homework.every((h) => h.tasks === 0) ? (
            <EmptyState title={t("noHomework")} text="" />
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.homework.filter((h) => h.tasks > 0).map((h) => (
                <li key={h.group} className="py-2">
                  <p className="font-bold text-navy-900">{h.group}</p>
                  <p className="text-xs text-muted">{t("homeworkRow", { done: h.done, tasks: h.tasks, students: h.students })}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
