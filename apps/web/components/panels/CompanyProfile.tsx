"use client";

import { buttonClass } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CARD } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Profile = Record<string, string>;
const EDITABLE = ["legal_name", "registration_no", "address", "website", "contact_person", "contact_email", "contact_phone"] as const;

export function CompanyProfile() {
  const t = useTranslations("ed");
  const [data, setData] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void send<Profile>("/api/v1/employers/profile", "GET").then((result) => {
      if (result.ok && result.data) setData(result.data);
      else setFailed(true);
    });
  }, []);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  async function save() {
    const body = Object.fromEntries([...EDITABLE, "description"].map((key) => [key, data?.[key] ?? ""]));
    const result = await send("/api/v1/employers/profile", "PUT", body);
    setMsg(result.ok ? { ok: true, text: t("pf.saved") } : { ok: false, text: t("pf.failed") });
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  return (
    <section className={`${CARD} flex flex-col gap-4`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          {t("pf.name")}
          <input className={FIELD} value={data.name ?? ""} readOnly aria-readonly="true" />
        </label>
        <label className={label}>
          {t("pf.inn")}
          <input className={FIELD} value={data.inn ?? ""} readOnly aria-readonly="true" />
        </label>
        {EDITABLE.map((key) => (
          <label key={key} className={label}>
            {t(`pf.${key}` as "pf.address")}
            <input className={FIELD} value={data[key] ?? ""} onChange={(event) => setData({ ...data, [key]: event.target.value })} />
          </label>
        ))}
      </div>
      <label className={label}>
        {t("pf.description")}
        <textarea className={`${FIELD} min-h-28 py-2`} value={data.description ?? ""} onChange={(event) => setData({ ...data, description: event.target.value })} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass()} onClick={() => void save()}>{t("pf.save")}</button>
        {msg ? <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-success-600" : "text-danger-600"}`}>{msg.text}</p> : null}
      </div>
    </section>
  );
}
