"use client";

import { buttonClass } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge, CARD } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Settings = {
  full_name: string;
  phone: string;
  email: string;
  locale: string;
  notify: Record<string, boolean>;
  telegram_linked: boolean;
  two_factor: boolean;
  roles: string[];
  created: string;
  last_login: string | null;
  consents: { kind: string; version: string; granted: boolean; day: string }[];
};
type Device = { id: string; agent: string; created: string; expires: string; current: boolean };

const GROUPS = ["offers", "vacancies", "system"] as const;
const LOCALES: [string, string][] = [["uz-Latn", "O'zbekcha (lotin)"], ["uz-Cyrl", "Ўзбекча (кирилл)"], ["ru", "Русский"], ["en", "English"]];

function deviceName(agent: string): string {
  const os = /Windows/.test(agent) ? "Windows" : /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Mac OS/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "";
  const browser = /Edg\//.test(agent) ? "Edge" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "";
  return [browser, os].filter(Boolean).join(" · ") || agent.slice(0, 40) || "—";
}

export function SettingsPanel({ roleNames }: { roleNames: Record<string, string> }) {
  const t = useTranslations("st");
  const [data, setData] = useState<Settings | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [settings, sessions] = await Promise.all([send<Settings>("/api/v1/me/settings", "GET"), send<Device[]>("/api/v1/me/sessions", "GET")]);
    if (settings.ok && settings.data) {
      setData(settings.data);
      setState("ready");
    } else setState("error");
    if (sessions.ok && sessions.data) setDevices(sessions.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") return <p className="text-sm text-muted">{t("loading")}</p>;
  if (state === "error" || !data) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;

  async function save() {
    if (!data) return;
    setSaving(true);
    setNote(null);
    const result = await send("/api/v1/me/settings", "PUT", { full_name: data.full_name, email: data.email, locale: data.locale, notify: data.notify });
    setSaving(false);
    setNote(result.ok ? { ok: true, text: t("saved") } : { ok: false, text: t("failed") });
  }

  async function end(id: string) {
    await send(`/api/v1/me/sessions/${id}`, "DELETE");
    await load();
  }

  async function endOthers() {
    const result = await send<{ ended: number }>("/api/v1/me/sessions/revoke-others", "POST");
    if (result.ok && result.data) setNote({ ok: true, text: t("ended", { n: result.data.ended }) });
    await load();
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  const row = "flex items-center justify-between gap-3 py-3";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-6">
        <section className={CARD} aria-labelledby="st-profile">
          <h2 id="st-profile" className="text-lg font-extrabold text-navy-900">{t("profile")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className={label}>
              {t("name")}
              <input className={FIELD} value={data.full_name} onChange={(event) => setData({ ...data, full_name: event.target.value })} />
            </label>
            <label className={label}>
              {t("phone")}
              <input className={FIELD} value={data.phone} readOnly aria-readonly="true" />
            </label>
            <label className={label}>
              {t("email")}
              <input type="email" className={FIELD} value={data.email} onChange={(event) => setData({ ...data, email: event.target.value })} />
              <span className="text-xs font-normal">{t("emailHint")}</span>
            </label>
            <label className={label}>
              {t("locale")}
              <select className={FIELD} value={data.locale} onChange={(event) => setData({ ...data, locale: event.target.value })}>
                {LOCALES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">{t("phoneHint")}</p>
          <div className="mt-3 inline-flex rounded-xl border border-line bg-surface-100 p-2 text-navy-900">
            <LanguageSwitcher />
          </div>
        </section>

        <section className={CARD} aria-labelledby="st-notify">
          <h2 id="st-notify" className="text-lg font-extrabold text-navy-900">{t("notify")}</h2>
          <p className="mt-1 text-sm text-muted">{t("notifyText")}</p>
          <ul className="mt-2 divide-y divide-line">
            {GROUPS.map((group) => (
              <li key={group} className={row}>
                <label htmlFor={`n-${group}`} className="text-sm font-semibold text-navy-900">{t(`n.${group}` as "n.offers")}</label>
                <input
                  id={`n-${group}`}
                  type="checkbox"
                  className="size-5 accent-[var(--primary)]"
                  checked={data.notify[group] !== false}
                  onChange={(event) => setData({ ...data, notify: { ...data.notify, [group]: event.target.checked } })}
                />
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={buttonClass()} disabled={saving} onClick={() => void save()}>{t("save")}</button>
          {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <section className={CARD} aria-labelledby="st-roles">
          <h2 id="st-roles" className="text-lg font-extrabold text-navy-900">{t("roles")}</h2>
          <p className="mt-3 flex flex-wrap gap-1.5">
            {data.roles.map((role) => <Badge key={role} tone="blue">{roleNames[role] ?? role}</Badge>)}
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("since")}</dt><dd className="font-bold text-navy-900">{data.created}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted">{t("lastLogin")}</dt><dd className="font-bold text-navy-900">{data.last_login ?? "—"}</dd></div>
          </dl>
        </section>

        <section className={CARD} aria-labelledby="st-sec">
          <h2 id="st-sec" className="text-lg font-extrabold text-navy-900">{t("security")}</h2>
          <ul className="mt-2 divide-y divide-line">
            <li className={row}><span className="text-sm font-semibold text-navy-900">{t("twofa")}</span><Badge tone={data.two_factor ? "green" : "gray"}>{data.two_factor ? t("on") : t("off")}</Badge></li>
            <li className={row}><span className="text-sm font-semibold text-navy-900">{t("telegram")}</span><Badge tone={data.telegram_linked ? "green" : "gray"}>{data.telegram_linked ? t("linked") : t("notLinked")}</Badge></li>
          </ul>
          <h3 className="mt-4 text-sm font-bold text-navy-900">{t("devices")}</h3>
          {devices.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("noDevices")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {devices.slice(0, 8).map((device) => (
                <li key={device.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy-900">{deviceName(device.agent)} {device.current ? <Badge tone="green">{t("current")}</Badge> : null}</p>
                    <p className="text-xs text-muted">{device.created} · {t("until", { day: device.expires })}</p>
                  </div>
                  {device.current ? null : <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void end(device.id)}>{t("end")}</button>}
                </li>
              ))}
            </ul>
          )}
          {devices.length > 1 ? <button type="button" className={`${buttonClass({ variant: "secondary" })} mt-3`} onClick={() => void endOthers()}>{t("endOthers")}</button> : null}
        </section>

        <section className={CARD} aria-labelledby="st-priv">
          <h2 id="st-priv" className="text-lg font-extrabold text-navy-900">{t("privacy")}</h2>
          <p className="mt-2 text-sm text-muted">{t("privacyText")}</p>
          <h3 className="mt-4 text-sm font-bold text-navy-900">{t("consents")}</h3>
          {data.consents.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("noConsents")}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {data.consents.map((item) => (
                <li key={item.kind} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-semibold text-navy-900">{item.kind} · v{item.version}</span>
                  <Badge tone={item.granted ? "green" : "amber"}>{item.granted ? t("granted") : t("revoked")} · {item.day}</Badge>
                </li>
              ))}
            </ul>
          )}
          <a href="/api/v1/me/export" download className={`${buttonClass({ variant: "secondary" })} mt-4`}>{t("export")}</a>
          <p className="mt-2 text-xs text-muted">{t("exportHint")}</p>
        </section>
      </div>
    </div>
  );
}
