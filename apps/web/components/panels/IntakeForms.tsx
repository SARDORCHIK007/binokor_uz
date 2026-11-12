"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Badge, CARD, type Tone } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Options = { mahallas: { id: string; name: string }[]; trades: { code: string; name: string }[] };
type Mine = { id: string; org_name: string; kind: string; status: string; created: string }[];

const KINDS = ["EMPLOYER", "PRODUCER", "EDU", "GOV", "INTL", "AGENCY"] as const;
const TONE: Record<string, Tone> = { NEW: "amber", APPROVED: "green", REJECTED: "red" };

export function IntakeForms({ options, initialMine }: { options: Options; initialMine: Mine }) {
  const t = useTranslations("add");
  const mp = useTranslations("mp");
  const inv = useTranslations("inv");
  const kinds = useTranslations("partnersPage");
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);
  const [seekerNote, setSeekerNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [partnerNote, setPartnerNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function seeker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setSeekerNote(null);
    const result = await send("/api/v1/employment/seekers", "POST", {
      first_name: form.get("first"),
      last_name: form.get("last"),
      birth_date: form.get("birth"),
      phone: String(form.get("phone") ?? "").replace(/\s/g, ""),
      trade_code: form.get("trade"),
      track: form.get("track"),
      experience_years: Number(form.get("exp") || 0),
      has_language: form.get("lang") === "on",
      mahalla_id: form.get("mahalla") || null,
      consent_confirmed: form.get("consent") === "on",
    });
    setBusy(false);
    if (result.ok) {
      setSeekerNote({ ok: true, text: mp("saved") });
      formElement.reset();
    } else {
      setSeekerNote({ ok: false, text: result.status === 409 ? mp("err409") : mp("errGeneric") });
    }
  }

  async function partner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setPartnerNote(null);
    const result = await send("/api/v1/employment/partners", "POST", {
      org_name: form.get("org"),
      kind: form.get("kind"),
      country_code: "UZ",
      contact_name: form.get("contact"),
      phone: String(form.get("phone") ?? "").replace(/\s/g, ""),
      email: form.get("email") || null,
      message: form.get("message") || null,
    });
    setBusy(false);
    if (result.ok) {
      setPartnerNote({ ok: true, text: t("sent") });
      formElement.reset();
      const fresh = await send<Mine>("/api/v1/employment/partners", "GET");
      if (fresh.ok && fresh.data) setMine(fresh.data);
    } else {
      setPartnerNote({ ok: false, text: t("failed") });
    }
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className={CARD} aria-labelledby="seeker">
        <h2 id="seeker" className="text-xl font-extrabold text-navy-900">{t("seekerTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("seekerText")}</p>
        <form onSubmit={(event) => void seeker(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={label}>
            {mp("f.last")}
            <input name="last" className={FIELD} required minLength={2} maxLength={80} />
          </label>
          <label className={label}>
            {mp("f.first")}
            <input name="first" className={FIELD} required minLength={2} maxLength={80} />
          </label>
          <label className={label}>
            {mp("f.birth")}
            <input name="birth" type="date" className={FIELD} required />
          </label>
          <label className={label}>
            {mp("f.phone")}
            <input name="phone" inputMode="tel" placeholder="+998901234567" className={FIELD} required />
          </label>
          <label className={label}>
            {mp("f.trade")}
            <select name="trade" className={FIELD} required>
              {options.trades.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            {mp("f.track")}
            <select name="track" className={FIELD}>
              <option value="DOMESTIC">{mp("track.DOMESTIC")}</option>
              <option value="FOREIGN">{mp("track.FOREIGN")}</option>
            </select>
          </label>
          <label className={label}>
            {mp("f.mahalla")}
            <select name="mahalla" className={FIELD} defaultValue="">
              <option value="">{t("noMahalla")}</option>
              {options.mahallas.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            {mp("f.exp")}
            <input name="exp" type="number" min={0} max={40} step="0.5" defaultValue={0} className={FIELD} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-navy-900 sm:col-span-2">
            <input name="lang" type="checkbox" className="size-4 accent-[var(--primary)]" />
            {mp("f.lang")}
          </label>
          <label className="flex items-start gap-2 text-sm font-semibold text-navy-900 sm:col-span-2">
            <input name="consent" type="checkbox" required className="mt-0.5 size-4 accent-[var(--primary)]" />
            {mp("f.consent")}
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button type="submit" disabled={busy}>{mp("save")}</Button>
            {seekerNote ? (
              <p role="status" className={`text-sm font-semibold ${seekerNote.ok ? "text-success-600" : "text-danger-600"}`}>
                {seekerNote.ok ? "✓ " : ""}
                {seekerNote.text}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-6">
        <div className={CARD}>
          <h2 className="text-xl font-extrabold text-navy-900">{t("partnerTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("partnerText")}</p>
          <form onSubmit={(event) => void partner(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              {t("org")}
              <input name="org" className={FIELD} required minLength={2} maxLength={200} />
            </label>
            <label className={label}>
              {t("kind")}
              <select name="kind" className={FIELD}>
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>{kinds(`kind.${kind}`)}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              {t("contact")}
              <input name="contact" className={FIELD} required minLength={3} maxLength={120} />
            </label>
            <label className={label}>
              {t("phone")}
              <input name="phone" inputMode="tel" placeholder="+998901234567" className={FIELD} required />
            </label>
            <label className={label}>
              {t("email")}
              <input name="email" type="email" className={FIELD} maxLength={120} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              {t("message")}
              <textarea name="message" rows={3} maxLength={2000} className={`${FIELD} py-2`} />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit" disabled={busy}>{t("send")}</Button>
              {partnerNote ? (
                <p role="status" className={`text-sm font-semibold ${partnerNote.ok ? "text-success-600" : "text-danger-600"}`}>
                  {partnerNote.ok ? "✓ " : ""}
                  {partnerNote.text}
                </p>
              ) : null}
            </div>
          </form>
        </div>

        <div className={CARD}>
          <h2 className="text-lg font-extrabold text-navy-900">{t("mine")}</h2>
          {mine.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("none")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {mine.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-navy-900">{item.org_name}</span>
                    <span className="text-xs text-muted">{kinds(`kind.${item.kind}` as "kind.GOV")} · {item.created}</span>
                  </span>
                  <Badge tone={TONE[item.status] ?? "gray"}>{inv(`status.${item.status}` as "status.NEW")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
