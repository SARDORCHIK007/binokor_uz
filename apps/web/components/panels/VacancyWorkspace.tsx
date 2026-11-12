"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Badge, CARD, type Tone } from "@/components/cabinet/kit";
import { Flag } from "@/components/Flag";
import { FIELD, send } from "@/lib/clientApi";

export type VacancyItem = {
  id: string;
  title: string;
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
  duties: string;
  requirements: { min_level?: string; min_experience_years?: number; certificate_required?: boolean; language?: string; language_level?: number; notes?: string };
  benefits: Record<string, boolean>;
  schedule: string;
  deadline: string | null;
  city: string;
  address: string;
  map_url: string;
  candidates: number;
};

export type Legal = Record<"legal_name" | "registration_no" | "inn" | "license_ref" | "address" | "website" | "contact_person" | "contact_email" | "contact_phone" | "description", string>;

export type WorkspaceData = {
  employer: { name: string; kind: "LOCAL" | "FOREIGN"; country: string; verified: boolean; legal: Legal };
  vacancies: VacancyItem[];
  documents: { id: string; kind: string; filename: string; size_bytes: number; day: string; checked: boolean }[];
  trades: { code: string; name: string }[];
  countries: string[];
  currencies: string[];
  levels: string[];
  benefits: string[];
};

const LANGS = ["ru", "en", "ko", "ja", "de", "it"] as const;
const LEGAL_FIELDS = ["legal_name", "registration_no", "inn", "license_ref", "address", "website", "contact_person", "contact_email", "contact_phone"] as const;
const DOC_KINDS = ["REGISTRATION", "LICENSE", "POWER_OF_ATTORNEY", "CONTRACT", "OTHER"] as const;
const STATUS_TONE: Record<string, Tone> = { NEW: "amber", MATCHED: "green", CLOSED: "gray", CANCELLED: "red" };

export function VacancyWorkspace({ initial }: { initial: WorkspaceData }) {
  const t = useTranslations("vw");
  const mg = useTranslations("mg");
  const countries = useTranslations("countries");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<"vacancies" | "company">("vacancies");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [legal, setLegal] = useState<Legal>(initial.employer.legal);
  const foreign = data.employer.kind === "FOREIGN";
  const countryName = (code: string) => (countries.has(code as "KR") ? countries(code as "KR") : code);
  const money = (value: number) => value.toLocaleString("ru-RU");

  async function reload() {
    const fresh = await send<WorkspaceData>(`/api/v1/vacancies/me?lang=${locale}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function post(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const num = (key: string) => (form.get(key) ? Number(form.get(key)) : null);
    const benefits: Record<string, boolean> = {};
    for (const key of data.benefits) benefits[key] = form.get(`b_${key}`) === "on";
    setBusy(true);
    setNote(null);
    const result = await send("/api/v1/vacancies", "POST", {
      title: form.get("title"),
      trade_code: form.get("trade"),
      quantity: Number(form.get("quantity") || 1),
      country_code: foreign ? form.get("country") : null,
      city: form.get("city") ?? "",
      address: form.get("address") ?? "",
      map_url: form.get("map") ?? "",
      start_date: form.get("start") || null,
      deadline: form.get("deadline") || null,
      duration_months: num("months"),
      schedule: form.get("schedule") ?? "",
      salary_from: num("from"),
      salary_to: num("to"),
      currency: form.get("currency"),
      as_brigade: form.get("brigade") === "on",
      duties: form.get("duties") ?? "",
      conditions: form.get("conditions") ?? "",
      requirements: {
        min_level: form.get("level") || null,
        min_experience_years: form.get("years") || null,
        certificate_required: form.get("certificate") === "on",
        language: form.get("language") || null,
        language_level: form.get("langLevel") || 0,
        notes: form.get("notes") ?? "",
      },
      benefits,
    });
    setBusy(false);
    if (result.ok) {
      setNote({ ok: true, text: t("posted") });
      formElement.reset();
      setOpen(false);
      await reload();
    } else {
      setNote({ ok: false, text: t("postFailed") });
    }
  }

  async function close(id: string) {
    await send(`/api/v1/vacancies/${id}/close`, "POST");
    await reload();
  }

  async function saveLegal(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote(null);
    const result = await send("/api/v1/vacancies/legal", "PUT", { ...legal, contact_phone: legal.contact_phone });
    setBusy(false);
    setNote(result.ok ? { ok: true, text: t("legalSaved") } : { ok: false, text: t("legalFailed") });
    if (result.ok) await reload();
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch(`/api/v1/vacancies/documents?kind=${encodeURIComponent(String(form.get("kind")))}&filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        credentials: "include",
        body: file,
      });
      setNote(response.ok ? { ok: true, text: t("docs.uploaded") } : { ok: false, text: t("docs.failed") });
      if (response.ok) {
        formElement.reset();
        await reload();
      }
    } catch {
      setNote({ ok: false, text: t("docs.failed") });
    }
    setBusy(false);
  }

  async function removeDoc(id: string) {
    await send(`/api/v1/vacancies/documents/${id}`, "DELETE");
    await reload();
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  const section = "text-sm font-extrabold tracking-wide text-navy-900 uppercase";

  return (
    <div className="flex flex-col gap-6">
      <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <Flag code={data.employer.country} className="size-7" />
        <span className="font-bold text-navy-900">{data.employer.name}</span>
        <Badge tone={data.employer.verified ? "green" : "amber"}>{data.employer.verified ? t("verified") : t("unverified")}</Badge>
      </p>
      {!data.employer.verified ? <p className="rounded-xl bg-warning-100 px-4 py-3 text-sm font-semibold text-navy-900">{t("notVerified")}</p> : null}

      <div role="tablist" className="flex gap-2">
        {(["vacancies", "company"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setNote(null);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${tab === key ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
          >
            {key === "vacancies" ? t("tabVacancies") : t("tabCompany")}
          </button>
        ))}
      </div>

      {note ? (
        <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
          {note.ok ? "✓ " : ""}
          {note.text}
        </p>
      ) : null}

      {tab === "vacancies" ? (
        <>
          {open ? (
            <form onSubmit={(event) => void post(event)} className={`${CARD} flex flex-col gap-6`}>
              <h2 className="text-xl font-extrabold text-navy-900">{t("newButton")}</h2>
              <fieldset className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <legend className={`${section} mb-3`}>{t("sec.main")}</legend>
                <label className={`${label} md:col-span-2`}>
                  {t("f.title")}
                  <input name="title" className={FIELD} required minLength={3} maxLength={160} />
                </label>
                <label className={label}>
                  {t("f.trade")}
                  <select name="trade" className={FIELD} required>
                    {data.trades.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  {t("f.quantity")}
                  <input name="quantity" type="number" min={1} max={500} defaultValue={1} className={FIELD} required />
                </label>
                {foreign ? (
                  <label className={label}>
                    {t("f.country")}
                    <select name="country" className={FIELD} defaultValue={data.countries.includes(data.employer.country) ? data.employer.country : undefined} required>
                      {data.countries.map((code) => (
                        <option key={code} value={code}>{countryName(code)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className={label}>
                  {t("f.city")}
                  <input name="city" className={FIELD} required={foreign} maxLength={120} />
                </label>
                <label className={`${label} md:col-span-2`}>
                  {t("f.address")}
                  <input name="address" className={FIELD} required={foreign} maxLength={300} />
                </label>
                <label className={label}>
                  {t("f.map")}
                  <input name="map" type="url" placeholder="https://maps…" className={FIELD} maxLength={300} />
                </label>
                <label className={label}>
                  {t("f.start")}
                  <input name="start" type="date" className={FIELD} />
                </label>
                <label className={label}>
                  {t("f.deadline")}
                  <input name="deadline" type="date" className={FIELD} />
                </label>
                <label className={label}>
                  {t("f.months")}
                  <input name="months" type="number" min={1} max={60} className={FIELD} />
                </label>
                <label className={label}>
                  {t("f.schedule")}
                  <input name="schedule" className={FIELD} maxLength={120} />
                </label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
                  <input name="brigade" type="checkbox" className="size-4 accent-[var(--primary)]" />
                  {t("f.brigade")}
                </label>
              </fieldset>

              <fieldset className="grid gap-4 md:grid-cols-3">
                <legend className={`${section} mb-3`}>{t("sec.pay")}</legend>
                <label className={label}>
                  {t("f.from")}
                  <input name="from" type="number" min={0} className={FIELD} />
                </label>
                <label className={label}>
                  {t("f.to")}
                  <input name="to" type="number" min={0} className={FIELD} />
                </label>
                <label className={label}>
                  {t("f.currency")}
                  <select name="currency" className={FIELD} defaultValue={foreign ? "USD" : "UZS"}>
                    {data.currencies.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <fieldset className="grid gap-4">
                <legend className={`${section} mb-3`}>{t("sec.duties")}</legend>
                <label className={label}>
                  {t("f.duties")}
                  <textarea name="duties" rows={4} maxLength={3000} className={`${FIELD} py-2`} />
                </label>
              </fieldset>

              <fieldset className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <legend className={`${section} mb-3`}>{t("sec.req")}</legend>
                <label className={label}>
                  {t("f.level")}
                  <select name="level" className={FIELD} defaultValue="">
                    <option value="">{t("f.anyLevel")}</option>
                    {data.levels.map((level) => (
                      <option key={level} value={level}>{t(`level.${level}` as "level.MASTER")}</option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  {t("f.experience")}
                  <input name="years" type="number" min={0} max={40} step="0.5" className={FIELD} />
                </label>
                <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
                  <input name="certificate" type="checkbox" className="size-4 accent-[var(--primary)]" />
                  {t("f.certificate")}
                </label>
                <label className={label}>
                  {t("f.language")}
                  <select name="language" className={FIELD} defaultValue="">
                    <option value="">{t("f.noLanguage")}</option>
                    {LANGS.map((code) => (
                      <option key={code} value={code}>{t(`lang.${code}`)}</option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  {t("f.langLevel")}
                  <select name="langLevel" className={FIELD} defaultValue="0">
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n === 0 ? "—" : ["", "A1", "A2", "B1", "B2", "C1", "C2"][n]}</option>
                    ))}
                  </select>
                </label>
                <label className={`${label} md:col-span-2 xl:col-span-3`}>
                  {t("f.notes")}
                  <textarea name="notes" rows={2} maxLength={800} className={`${FIELD} py-2`} />
                </label>
              </fieldset>

              <fieldset className="grid gap-4">
                <legend className={`${section} mb-3`}>{t("sec.offer")}</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {data.benefits.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                      <input name={`b_${key}`} type="checkbox" className="size-4 accent-[var(--primary)]" />
                      {t(`benefit.${key}` as "benefit.housing")}
                    </label>
                  ))}
                </div>
                <label className={label}>
                  {t("f.conditions")}
                  <textarea name="conditions" rows={3} maxLength={2000} className={`${FIELD} py-2`} />
                </label>
              </fieldset>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={busy || !data.employer.verified}>{busy ? t("posting") : t("post")}</Button>
                <button type="button" className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-navy-900" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <Button type="button" onClick={() => setOpen(true)}>+ {t("newButton")}</Button>
            </div>
          )}

          <section aria-labelledby="mine" className="flex flex-col gap-3">
            <h2 id="mine" className="text-xl font-extrabold text-navy-900">{t("mine")}</h2>
            {data.vacancies.length === 0 ? (
              <EmptyState title={t("none")} text="" />
            ) : (
              <ul className="flex flex-col gap-3">
                {data.vacancies.map((item) => {
                  const req = item.requirements;
                  return (
                    <li key={item.id} className={`${CARD} flex flex-wrap items-start justify-between gap-4`}>
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {foreign ? <Flag code={item.country} className="mt-0.5 size-9" /> : null}
                        <div className="min-w-0">
                          <p className="font-bold text-navy-900">{item.title || item.trade}</p>
                          <p className="text-sm text-muted">
                            {item.trade}
                            {item.city ? ` · ${item.city}` : ""}
                            {item.address ? `, ${item.address}` : ""}
                          </p>
                          <p className="mt-1.5 flex flex-wrap gap-1.5">
                            <Badge tone="blue">{t("places", { n: item.quantity })}</Badge>
                            <Badge tone="green">
                              {item.salary_from !== null && item.salary_to !== null
                                ? mg("salary", { from: money(item.salary_from), to: money(item.salary_to), cur: item.currency ?? "" })
                                : item.salary_from !== null
                                  ? mg("salaryFrom", { from: money(item.salary_from), cur: item.currency ?? "" })
                                  : mg("salaryNone")}
                            </Badge>
                            {item.deadline ? <Badge tone="amber">{t("deadline", { date: item.deadline })}</Badge> : null}
                            <Badge tone={item.candidates > 0 ? "green" : "gray"}>{t("candidates", { n: item.candidates })}</Badge>
                            <Badge tone={STATUS_TONE[item.status] ?? "blue"}>{mg(`status.${item.status}` as "status.NEW")}</Badge>
                          </p>
                          <p className="mt-1.5 flex flex-wrap gap-1.5">
                            {req.min_level ? <Badge tone="gray">{t("reqLevel", { level: t(`level.${req.min_level}` as "level.MASTER") })}</Badge> : null}
                            {req.min_experience_years ? <Badge tone="gray">{t("reqYears", { n: req.min_experience_years })}</Badge> : null}
                            {req.certificate_required ? <Badge tone="gray">{t("reqCertificate")}</Badge> : null}
                            {req.language ? (
                              <Badge tone="gray">
                                {t("reqLanguage", { lang: t.has(`lang.${req.language}` as "lang.ru") ? t(`lang.${req.language}` as "lang.ru") : req.language, level: req.language_level ?? 0 })}
                              </Badge>
                            ) : null}
                            {Object.entries(item.benefits).filter(([, on]) => on).map(([key]) => (
                              <Badge key={key} tone="green">{t(`benefit.${key}` as "benefit.housing")}</Badge>
                            ))}
                          </p>
                          {item.duties ? <p className="mt-2 max-w-[80ch] text-xs text-muted">{item.duties}</p> : null}
                        </div>
                      </div>
                      {item.status !== "CLOSED" && item.status !== "CANCELLED" ? (
                        <button type="button" className="rounded-xl border border-line-strong px-4 py-2 text-sm font-bold text-navy-900 hover:border-danger-600 hover:text-danger-600" onClick={() => void close(item.id)}>
                          {t("close")}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <form onSubmit={(event) => void saveLegal(event)} className={CARD}>
            <h2 className="text-xl font-extrabold text-navy-900">{t("company.legal")}</h2>
            <p className="mt-1 text-sm text-muted">{t("company.legalText")}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {LEGAL_FIELDS.filter((key) => key !== "inn" || !foreign).map((key) => (
                <label key={key} className={label}>
                  {t(`l.${key}`)}
                  <input value={legal[key]} onChange={(event) => setLegal({ ...legal, [key]: event.target.value })} className={FIELD} maxLength={300} />
                </label>
              ))}
              <label className={`${label} md:col-span-2`}>
                {t("l.description")}
                <textarea value={legal.description} onChange={(event) => setLegal({ ...legal, description: event.target.value })} rows={4} maxLength={2000} className={`${FIELD} py-2`} />
              </label>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={busy}>{t("saveLegal")}</Button>
            </div>
          </form>

          <section className={CARD} aria-labelledby="docs">
            <h2 id="docs" className="text-xl font-extrabold text-navy-900">{t("docs.title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("docs.text")}</p>
            <form onSubmit={(event) => void upload(event)} className="mt-4 flex flex-wrap items-end gap-3">
              <label className={label}>
                {t("docs.kind")}
                <select name="kind" className={`${FIELD} w-64`}>
                  {DOC_KINDS.map((kind) => (
                    <option key={kind} value={kind}>{t(`docKind.${kind}`)}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                {t("docs.file")}
                <input name="file" type="file" accept=".pdf,image/jpeg,image/png" required className={`${FIELD} py-2`} />
              </label>
              <Button type="submit" disabled={busy}>{busy ? t("docs.uploading") : t("docs.upload")}</Button>
            </form>
            {data.documents.length === 0 ? (
              <p className="mt-4 text-sm text-muted">{t("docs.none")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
                {data.documents.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-navy-900">{doc.filename}</span>
                      <span className="text-xs text-muted">
                        {t(`docKind.${doc.kind}` as "docKind.OTHER")} · {(doc.size_bytes / 1024).toFixed(0)} KB · {doc.day}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge tone={doc.checked ? "green" : "amber"}>{doc.checked ? t("docs.checked") : t("docs.pending")}</Badge>
                      <a href={`/api/v1/vacancies/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                        {t("docs.open")}
                      </a>
                      <button type="button" className="font-bold text-danger-600 hover:underline" onClick={() => void removeDoc(doc.id)}>
                        {t("docs.delete")}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
