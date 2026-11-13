"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Badge, CARD, Tile, initials, type Tone } from "@/components/cabinet/kit";
import { TaskInbox } from "@/components/people/TaskInbox";
import { ReferDialog, type FreeWorker } from "@/components/panels/ReferDialog";
import { send } from "@/lib/clientApi";

export type EmploymentData = {
  kpi: Record<string, number>;
  requests: { id: string; employer: string; trade: string; quantity: number; location: string; status: string; created: string; candidates: number }[];
  workers: FreeWorker[];
  placements: { name: string; employer: string; kind: string; start: string }[];
};

const KPIS = ["free_workers", "open_requests", "open_places", "employers", "placements", "certified"] as const;
const TONES: Tone[] = ["green", "amber", "amber", "blue", "green", "blue"];

export function EmploymentPanel({ initial }: { initial: EmploymentData }) {
  const t = useTranslations("ep");
  const mg = useTranslations("mg");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [referring, setReferring] = useState<string | null>(null);

  async function reload() {
    const fresh = await send<EmploymentData>(`/api/v1/employment/overview?lang=${locale}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {KPIS.map((key, index) => (
          <Tile key={key} label={t(`kpi.${key}`)} value={data.kpi[key] ?? 0} tone={TONES[index]} />
        ))}
      </div>

      <TaskInbox />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="requests" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="requests" className="text-xl font-extrabold text-navy-900">{t("requestsTitle")}</h2>
            <Link href="/kabinet/ishlar" className={buttonClass({ variant: "secondary" })}>{t("board")} →</Link>
          </div>
          {data.requests.length === 0 ? (
            <EmptyState title={t("emptyRequests")} text="" />
          ) : (
            <ul className="flex flex-col gap-3">
              {data.requests.map((item) => (
                <li key={item.id} className={`${CARD} flex flex-wrap items-center justify-between gap-3`}>
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">{item.employer}</p>
                    <p className="text-sm text-muted">
                      {item.trade} · {item.location} · {item.created}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="blue">{t("places", { n: item.quantity })}</Badge>
                      <Badge tone={item.candidates > 0 ? "green" : "gray"}>{t("candidates", { n: item.candidates })}</Badge>
                      <Badge tone="amber">{mg(`status.${item.status}` as "status.NEW")}</Badge>
                    </p>
                  </div>
                  <button type="button" className={buttonClass()} onClick={() => setReferring(item.id)}>
                    {t("refer")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="workers" className={CARD}>
            <h2 id="workers" className="text-lg font-extrabold text-navy-900">{t("workersTitle")}</h2>
            {data.workers.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{t("emptyWorkers")}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {data.workers.slice(0, 8).map((worker) => (
                  <li key={worker.user_id} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-primary" aria-hidden="true">
                      {initials(worker.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/ustalar/${worker.slug}`} className="block truncate text-sm font-bold text-navy-900 hover:text-primary">
                        {worker.name}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        {worker.trade} · {t("hours", { n: worker.hours })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="placed" className={CARD}>
            <h2 id="placed" className="text-lg font-extrabold text-navy-900">{t("placementsTitle")}</h2>
            <ul className="mt-3 divide-y divide-line">
              {data.placements.map((item, index) => (
                <li key={`${item.name}-${index}`} className="py-2 text-sm">
                  <p className="font-bold text-navy-900">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.employer} · {item.start}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {referring ? (
        <ReferDialog
          requestId={referring}
          workers={data.workers}
          labels={{ title: t("pick"), ok: t("referred"), failed: t("failed"), close: t("close"), hours: (n) => t("hours", { n }), empty: t("emptyWorkers") }}
          onClose={() => setReferring(null)}
          onDone={() => void reload()}
        />
      ) : null}
    </div>
  );
}
