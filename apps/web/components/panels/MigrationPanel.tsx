"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { TaskInbox } from "@/components/people/TaskInbox";
import { useState } from "react";
import { Badge, CARD, Meter, Tile, type Tone } from "@/components/cabinet/kit";
import { Flag } from "@/components/Flag";
import type { FreeWorker } from "@/components/panels/ReferDialog";
import { FIELD, send } from "@/lib/clientApi";

export type Vacancy = {
  id: string;
  employer: string;
  country: string;
  trade: string;
  quantity: number;
  salary_from: number | null;
  salary_to: number | null;
  currency: string | null;
  start: string | null;
  months: number | null;
  status: string;
  created: string;
  conditions: string | null;
  candidates: number;
};

export type MigrationData = {
  can_manage: boolean;
  kpi: Record<string, number>;
  by_country: { country: string; vacancies: number; places: number }[];
  pipeline: Record<string, number>;
  vacancies: Vacancy[];
  workers: FreeWorker[];
};

const KPIS = ["vacancies", "open_vacancies", "open_places", "foreign_employers", "placed_abroad", "brigades"] as const;
const TONES: Tone[] = ["blue", "amber", "amber", "blue", "green", "blue"];
const STAGES = ["NEW", "IN_REVIEW", "VIA_AGENCY", "SHORTLIST_SENT", "EMPLOYER_APPROVED", "CONTRACTING", "MATCHED", "CLOSED", "CANCELLED"] as const;
const STAGE_TONE: Record<string, Tone> = { NEW: "amber", MATCHED: "green", CLOSED: "gray", CANCELLED: "red" };

export function salaryText(
  t: (key: "salary" | "salaryFrom" | "salaryNone", values?: Record<string, string | number>) => string,
  item: { salary_from: number | null; salary_to: number | null; currency: string | null },
): string {
  const cur = item.currency ?? "";
  const money = (value: number) => value.toLocaleString("ru-RU");
  if (item.salary_from !== null && item.salary_to !== null) return t("salary", { from: money(item.salary_from), to: money(item.salary_to), cur });
  if (item.salary_from !== null) return t("salaryFrom", { from: money(item.salary_from), cur });
  return t("salaryNone");
}

export function MigrationPanel({ initial }: { initial: MigrationData }) {
  const t = useTranslations("mg");
  const ag = useTranslations("ag");
  const countries = useTranslations("countries");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("");

  async function reload() {
    const fresh = await send<MigrationData>(`/api/v1/migration/overview?lang=${locale}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function changeStatus(id: string, status: string) {
    setNote("");
    const result = await send(`/api/v1/migration/vacancies/${id}/status`, "POST", { status });
    if (!result.ok) setNote(result.status === 409 ? t("noAgency") : t("failed"));
    await reload();
  }

  const countryName = (code: string) => (countries.has(code as "KR") ? countries(code as "KR") : code);
  const shown = filter ? data.vacancies.filter((item) => item.country === filter) : data.vacancies;
  const maxVacancies = Math.max(1, ...data.by_country.map((item) => item.vacancies));

  return (
    <div className="flex flex-col gap-6">
      {data.can_manage ? <TaskInbox /> : null}
      {!data.can_manage ? (
        <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-primary" role="note">
          {t("readonly")}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {KPIS.map((key, index) => (
          <Tile key={key} label={t(`kpi.${key}`)} value={data.kpi[key] ?? 0} tone={TONES[index]} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={CARD} aria-labelledby="countries">
          <h2 id="countries" className="text-lg font-extrabold text-navy-900">{t("byCountry")}</h2>
          {data.by_country.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("empty")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {data.by_country.map((item) => (
                <li key={item.country}>
                  <button
                    type="button"
                    onClick={() => setFilter(filter === item.country ? "" : item.country)}
                    aria-pressed={filter === item.country}
                    className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-blue-50 ${filter === item.country ? "bg-blue-50 ring-1 ring-primary" : ""}`}
                  >
                    <Flag code={item.country} className="size-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-navy-900">{countryName(item.country)}</span>
                      <span className="block text-xs text-muted">{t("countryRow", { v: item.vacancies, p: item.places })}</span>
                      <span className="mt-1.5 block">
                        <Meter value={(100 * item.vacancies) / maxVacancies} label={countryName(item.country)} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={CARD} aria-labelledby="pipeline">
          <h2 id="pipeline" className="text-lg font-extrabold text-navy-900">{t("pipeline")}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STAGES.map((stage) => (
              <li key={stage} className="rounded-xl border border-line bg-surface-100 p-3">
                <p className="text-2xl font-extrabold text-navy-900 tabular-nums">{data.pipeline[stage] ?? 0}</p>
                <p className="text-xs font-semibold text-muted">{t(`status.${stage}`)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="vacancies" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="vacancies" className="text-xl font-extrabold text-navy-900">
            {t("vacanciesTitle")}
            {filter ? <span className="ml-2 text-base font-semibold text-muted">· {countryName(filter)}</span> : null}
          </h2>
          <a href="/api/v1/migration/export.csv" className={buttonClass({ variant: "secondary" })}>
            ⤓ {t("export")}
          </a>
        </div>
        {note ? (
          <p role="status" className="text-sm font-semibold text-danger-600">
            {note}
          </p>
        ) : null}
        {shown.length === 0 ? (
          <EmptyState title={t("empty")} text={t("emptyText")} />
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((item) => (
              <li key={item.id} className={`${CARD} flex flex-wrap items-start justify-between gap-4`}>
                <div className="flex min-w-0 items-start gap-3">
                  <Flag code={item.country} className="mt-0.5 size-9" />
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">
                      {item.trade} · {countryName(item.country)}
                    </p>
                    <p className="text-sm text-muted">
                      {item.employer} · {item.created}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="blue">{t("places", { n: item.quantity })}</Badge>
                      <Badge tone="green">{salaryText(t, item)}</Badge>
                      {item.months ? <Badge tone="gray">{t("months", { n: item.months })}</Badge> : null}
                      <Badge tone={item.candidates > 0 ? "green" : "gray"}>{t("candidates", { n: item.candidates })}</Badge>
                      <Badge tone={STAGE_TONE[item.status] ?? "blue"}>{t(`status.${item.status}` as "status.NEW")}</Badge>
                    </p>
                    {item.conditions ? <p className="mt-2 max-w-[70ch] text-xs text-muted">{item.conditions}</p> : null}
                  </div>
                </div>
                {data.can_manage ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={t("changeStatus")}
                      value={item.status}
                      onChange={(event) => void changeStatus(item.id, event.target.value)}
                      className={`${FIELD} !min-h-10 w-auto text-sm`}
                    >
                      {STAGES.map((stage) => (
                        <option key={stage} value={stage}>{t(`status.${stage}`)}</option>
                      ))}
                    </select>
                    <Link href={`/kabinet/migratsiya/vakansiya/${item.id}`} className={buttonClass()}>
                      {ag("open")} →
                    </Link>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
