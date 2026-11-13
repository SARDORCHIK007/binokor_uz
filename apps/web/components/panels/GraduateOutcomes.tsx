"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Tile } from "@/components/cabinet/kit";
import { send } from "@/lib/clientApi";

type Outcomes = {
  university: string;
  years: Record<string, string | number>[];
  totals: Record<string, number>;
};
type Lead = { id: string; full_name: string; specialty: string | null; graduation_year: number | null; status: string; follow_up: string | null; last_contact: string | null; due: boolean };

const KEYS = ["leads", "interested", "applied", "studying", "certified", "employed", "abroad"] as const;

function plusDays(days: number): string {
  const day = new Date();
  day.setDate(day.getDate() + days);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

export function GraduateOutcomes() {
  const t = useTranslations("go");
  const [data, setData] = useState<Outcomes | null>(null);
  const [due, setDue] = useState<Lead[]>([]);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [outcomes, list] = await Promise.all([send<Outcomes>("/api/v1/graduates/outcomes", "GET"), send<{ leads: Lead[] }>("/api/v1/graduates", "GET")]);
    if (outcomes.ok && outcomes.data) setData(outcomes.data);
    else setFailed(true);
    if (list.ok && list.data) setDue(list.data.leads.filter((lead) => lead.due));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  async function follow(id: string, date: string, contacted: boolean) {
    const result = await send(`/api/v1/graduates/${id}/follow-up`, "POST", { follow_up: date, contacted });
    setNote(result.ok ? { ok: true, text: t("saved") } : { ok: false, text: t("failed") });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {KEYS.map((key, index) => (
          <Tile key={key} label={t(`k.${key}`)} value={data.totals[key] ?? 0} tone={index < 3 ? "blue" : index === 3 ? "amber" : "green"} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/kabinet/bitiruvchilar" className={buttonClass({ variant: "secondary" })}>{t("back")}</Link>
        <a href="/api/v1/graduates/export.csv" download className={buttonClass({ variant: "secondary" })}>{t("csv")}</a>
      </div>

      <section className={CARD} aria-labelledby="go-due">
        <h2 id="go-due" className="text-lg font-extrabold text-navy-900">{t("due")} · {due.length}</h2>
        <p className="mt-1 text-sm text-muted">{t("dueText")}</p>
        {note ? <p role="status" className={`mt-2 text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}
        {due.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-success-600">✓ {t("noDue")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {due.map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-navy-900">{lead.full_name}</p>
                  <p className="text-xs text-muted">
                    {[lead.specialty, lead.graduation_year].filter(Boolean).join(" · ")}
                    {" · "}
                    {lead.last_contact ? t("lastContact", { day: lead.last_contact }) : t("never")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="amber">{lead.follow_up}</Badge>
                  <button type="button" className={buttonClass()} onClick={() => void follow(lead.id, plusDays(7), true)}>{t("contacted")}</button>
                  <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void follow(lead.id, plusDays(1), false)}>{t("snooze")}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={CARD} aria-labelledby="go-years">
        <h2 id="go-years" className="text-lg font-extrabold text-navy-900">{t("byYear")}</h2>
        {data.years.length === 0 ? (
          <EmptyState title={t("noYears")} text="" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">{t("year")}</th>
                  {KEYS.map((key) => (
                    <th key={key} scope="col" className="px-2 py-2 text-right font-semibold">{t(`k.${key}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.years.map((row) => (
                  <tr key={String(row.year)}>
                    <th scope="row" className="py-2 pr-3 font-bold text-navy-900">{row.year}</th>
                    {KEYS.map((key) => (
                      <td key={key} className="px-2 py-2 text-right tabular-nums text-navy-900">{row[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
