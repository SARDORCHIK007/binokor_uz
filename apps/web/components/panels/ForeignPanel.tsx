"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Badge, CARD, type Tone } from "@/components/cabinet/kit";
import { Flag } from "@/components/Flag";
import { salaryText, type Vacancy } from "@/components/panels/MigrationPanel";
import { FIELD, send } from "@/lib/clientApi";

export type ForeignData = {
  employer: { name: string; country: string; verified: boolean };
  vacancies: Vacancy[];
  trades: { code: string; name: string }[];
  countries: string[];
  currencies: string[];
};

const STAGE_TONE: Record<string, Tone> = { NEW: "amber", MATCHED: "green", CLOSED: "gray", CANCELLED: "red" };

export function ForeignPanel({ initial }: { initial: ForeignData }) {
  const t = useTranslations("fv");
  const mg = useTranslations("mg");
  const countries = useTranslations("countries");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const countryName = (code: string) => (countries.has(code as "KR") ? countries(code as "KR") : code);

  async function reload() {
    const fresh = await send<ForeignData>(`/api/v1/foreign/me?lang=${locale}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const number = (key: string) => (form.get(key) ? Number(form.get(key)) : null);
    setSaving(true);
    setNote(null);
    const result = await send("/api/v1/foreign/vacancies", "POST", {
      trade_code: form.get("trade"),
      quantity: Number(form.get("quantity") || 1),
      country_code: form.get("country"),
      salary_from: number("from"),
      salary_to: number("to"),
      currency: form.get("currency"),
      start_date: form.get("start") || null,
      duration_months: number("months"),
      as_brigade: form.get("brigade") === "on",
      conditions: form.get("conditions") || null,
    });
    setSaving(false);
    if (result.ok) {
      setNote({ ok: true, text: t("posted") });
      formElement.reset();
      await reload();
    } else {
      setNote({ ok: false, text: t("failed") });
    }
  }

  async function close(id: string) {
    const result = await send(`/api/v1/foreign/vacancies/${id}/close`, "POST");
    if (!result.ok) setNote({ ok: false, text: t("closeFailed") });
    await reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <Flag code={data.employer.country} className="size-7" />
        <span className="font-bold text-navy-900">{data.employer.name}</span>
        <Badge tone={data.employer.verified ? "green" : "amber"}>{data.employer.verified ? t("verified") : t("unverified")}</Badge>
      </p>

      <section className={CARD} aria-labelledby="new">
        <h2 id="new" className="text-xl font-extrabold text-navy-900">{t("newTitle")}</h2>
        {!data.employer.verified ? <p className="mt-2 text-sm font-semibold text-warning-600">{t("notVerified")}</p> : null}
        <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("trade")}
            <select name="trade" className={FIELD} required>
              {data.trades.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("quantity")}
            <input name="quantity" type="number" min={1} max={500} defaultValue={1} className={FIELD} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("country")}
            <select name="country" className={FIELD} defaultValue={data.countries.includes(data.employer.country) ? data.employer.country : undefined} required>
              {data.countries.map((code) => (
                <option key={code} value={code}>{countryName(code)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("salaryFrom")}
            <input name="from" type="number" min={0} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("salaryTo")}
            <input name="to" type="number" min={0} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("currency")}
            <select name="currency" className={FIELD}>
              {data.currencies.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("start")}
            <input name="start" type="date" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("months")}
            <input name="months" type="number" min={1} max={60} className={FIELD} />
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
            <input name="brigade" type="checkbox" className="size-4 accent-[var(--primary)]" />
            {t("brigade")}
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted md:col-span-2 xl:col-span-3">
            {t("conditions")}
            <textarea name="conditions" rows={3} maxLength={2000} className={`${FIELD} py-2`} />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-3">
            <Button type="submit" disabled={saving || !data.employer.verified}>{saving ? t("posting") : t("post")}</Button>
            {note ? (
              <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
                {note.ok ? "✓ " : ""}
                {note.text}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section aria-labelledby="mine" className="flex flex-col gap-3">
        <h2 id="mine" className="text-xl font-extrabold text-navy-900">{t("mine")}</h2>
        {data.vacancies.length === 0 ? (
          <EmptyState title={t("none")} text="" />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.vacancies.map((item) => (
              <li key={item.id} className={`${CARD} flex flex-wrap items-start justify-between gap-4`}>
                <div className="flex min-w-0 items-start gap-3">
                  <Flag code={item.country} className="mt-0.5 size-9" />
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">
                      {item.trade} · {countryName(item.country)}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="blue">{mg("places", { n: item.quantity })}</Badge>
                      <Badge tone="green">{salaryText(mg, item)}</Badge>
                      <Badge tone={item.candidates > 0 ? "green" : "gray"}>{mg("candidates", { n: item.candidates })}</Badge>
                      <Badge tone={STAGE_TONE[item.status] ?? "blue"}>{mg(`status.${item.status}` as "status.NEW")}</Badge>
                    </p>
                  </div>
                </div>
                {item.status !== "CLOSED" && item.status !== "CANCELLED" ? (
                  <button type="button" className="rounded-xl border border-line-strong px-4 py-2 text-sm font-bold text-navy-900 hover:border-danger-600 hover:text-danger-600" onClick={() => void close(item.id)}>
                    {t("close")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
