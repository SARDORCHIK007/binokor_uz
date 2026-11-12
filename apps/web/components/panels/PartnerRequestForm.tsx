"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { FIELD, send } from "@/lib/clientApi";

const KINDS = ["GOV", "EDU", "INTL", "EMPLOYER", "AGENCY", "PRODUCER"] as const;

/** Public form: an organisation asks to join; an administrator reviews it and then invites its staff. */
export function PartnerRequestForm({ countries }: { countries: string[] }) {
  const t = useTranslations("pr");
  const kinds = useTranslations("partnersPage");
  const countryNames = useTranslations("countries");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setNote(null);
    const result = await send("/api/v1/public/partner-requests", "POST", {
      org_name: form.get("org"),
      kind: form.get("kind"),
      country_code: form.get("country") || null,
      contact_name: form.get("contact"),
      phone: String(form.get("phone") ?? "").replace(/\s/g, ""),
      email: form.get("email") || null,
      message: form.get("message") || null,
    });
    setBusy(false);
    if (result.ok) {
      setNote({ ok: true, text: t("thanks") });
      formElement.reset();
    } else {
      setNote({ ok: false, text: result.status === 429 ? t("limit") : t("failed") });
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:grid-cols-2 sm:p-6">
      <label className="flex flex-col gap-1 text-sm font-semibold text-muted sm:col-span-2">
        {t("org")}
        <input name="org" className={FIELD} required minLength={2} maxLength={200} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
        {t("kind")}
        <select name="kind" className={FIELD} defaultValue="INTL">
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>{kinds(`kind.${kind}`)}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
        {t("country")}
        <select name="country" className={FIELD} defaultValue="UZ">
          <option value="UZ">{countryNames("UZ")}</option>
          {countries.map((code) => (
            <option key={code} value={code}>{countryNames.has(code as "KR") ? countryNames(code as "KR") : code}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
        {t("contact")}
        <input name="contact" className={FIELD} required minLength={3} maxLength={120} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
        {t("phone")}
        <input name="phone" inputMode="tel" placeholder="+998901234567" className={FIELD} required />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-muted sm:col-span-2">
        {t("email")}
        <input name="email" type="email" className={FIELD} maxLength={120} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-muted sm:col-span-2">
        {t("message")}
        <textarea name="message" rows={4} maxLength={2000} className={`${FIELD} py-2`} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? t("sending") : t("send")}</Button>
        {note ? (
          <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
            {note.ok ? "✓ " : ""}
            {note.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
