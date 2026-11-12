"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Badge, CARD, type Tone } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type InvitationsData = {
  options: {
    roles: Record<string, string[]>;
    mahallas: { id: string; name: string }[];
    partners: { slug: string; name: string; kind: string }[];
    countries: string[];
  };
  invitations: { id: string; phone: string; full_name: string; role: string; status: string; created: string; expires: string; partner: string; mahalla: string; org_name: string | null; country_code: string }[];
  requests: { id: string; org_name: string; kind: string; country_code: string; contact_name: string; phone: string; email: string | null; message: string | null; status: string; created: string }[];
};

const STATUS_TONE: Record<string, Tone> = { PENDING: "amber", ACCEPTED: "green", REVOKED: "gray", EXPIRED: "red", NEW: "amber", APPROVED: "green", REJECTED: "red" };

export function InvitationsPanel({ initial }: { initial: InvitationsData }) {
  const t = useTranslations("inv");
  const roles = useTranslations("roles");
  const kinds = useTranslations("partnersPage");
  const countries = useTranslations("countries");
  const [data, setData] = useState(initial);
  const [role, setRole] = useState("mentor");
  const [bulkRole, setBulkRole] = useState("mentor");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [bulkNote, setBulkNote] = useState<{ ok: boolean; text: string } | null>(null);
  const needs = data.options.roles[role] ?? [];
  const roleNames = Object.keys(data.options.roles);
  const countryName = (code: string) => (countries.has(code as "KR") ? countries(code as "KR") : code);

  async function reload() {
    const [list, queue] = await Promise.all([
      send<InvitationsData["invitations"]>("/api/v1/admin/invitations", "GET"),
      send<InvitationsData["requests"]>("/api/v1/admin/partner-requests", "GET"),
    ]);
    setData((current) => ({ ...current, invitations: list.data ?? current.invitations, requests: queue.data ?? current.requests }));
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setNote(null);
    const result = await send<{ detail?: string }>("/api/v1/admin/invitations", "POST", {
      phone: String(form.get("phone") ?? "").replace(/\s/g, ""),
      full_name: form.get("name"),
      role,
      partner_slug: form.get("partner") || null,
      mahalla_id: form.get("mahalla") || null,
      org_name: form.get("org") || null,
      country_code: form.get("country") || null,
      title: form.get("title") || null,
    });
    setBusy(false);
    if (result.ok) {
      setNote({ ok: true, text: t("sent") });
      formElement.reset();
      await reload();
    } else {
      setNote({ ok: false, text: result.data?.detail ?? t("failed") });
    }
  }

  async function bulk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setBulkNote(null);
    const result = await send<{ created: number; failed: { line: string; error: string }[] }>("/api/v1/admin/invitations/bulk", "POST", {
      role: bulkRole,
      partner_slug: form.get("partner") || null,
      mahalla_id: form.get("mahalla") || null,
      lines: form.get("lines"),
    });
    setBusy(false);
    if (result.ok && result.data) {
      setBulkNote({ ok: result.data.failed.length === 0, text: `${t("bulkResult", { created: result.data.created, failed: result.data.failed.length })}${result.data.failed.length ? ` — ${result.data.failed.map((item) => item.line).join("; ")}` : ""}` });
      if (result.data.failed.length === 0) formElement.reset();
      await reload();
    } else {
      setBulkNote({ ok: false, text: t("failed") });
    }
  }

  async function revoke(id: string) {
    await send(`/api/v1/admin/invitations/${id}`, "DELETE");
    await reload();
  }

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    await send(`/api/v1/admin/partner-requests/${id}/decision`, "POST", { status });
    await reload();
  }

  const roleSelect = (value: string, onChange: (next: string) => void) => (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={FIELD}>
      {roleNames.map((name) => (
        <option key={name} value={name}>{roles(name as "mentor")}</option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-3 sm:grid-cols-3">
        {(["how1", "how2", "how3"] as const).map((key, index) => (
          <li key={key} className={`${CARD} flex items-start gap-3`}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-white" aria-hidden="true">{index + 1}</span>
            <span className="pt-1 text-sm font-semibold text-navy-900">{t(key)}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={CARD} aria-labelledby="one">
          <h2 id="one" className="text-xl font-extrabold text-navy-900">{t("newTitle")}</h2>
          <form onSubmit={(event) => void invite(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted sm:col-span-2">
              {t("role")}
              {roleSelect(role, setRole)}
              <span className="text-xs font-normal text-muted">{t(`roleHelp.${role}` as "roleHelp.mentor")}</span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("phone")}
              <input name="phone" inputMode="tel" placeholder="+998901234567" className={FIELD} required />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("name")}
              <input name="name" className={FIELD} required minLength={3} maxLength={120} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("partner")}
              <select name="partner" className={FIELD} defaultValue="">
                <option value="">{t("noPartner")}</option>
                {data.options.partners.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("title2")}
              <input name="title" className={FIELD} maxLength={120} />
            </label>
            {needs.includes("mahalla_id") ? (
              <label className="flex flex-col gap-1 text-sm font-semibold text-muted sm:col-span-2">
                {t("mahalla")}
                <select name="mahalla" className={FIELD} required>
                  {data.options.mahallas.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {needs.includes("org_name") ? (
              <>
                <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
                  {t("org")}
                  <input name="org" className={FIELD} required maxLength={200} />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
                  {t("country")}
                  <select name="country" className={FIELD} required>
                    {data.options.countries.map((code) => (
                      <option key={code} value={code}>{countryName(code)}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
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
        </section>

        <section className={CARD} aria-labelledby="many">
          <h2 id="many" className="text-xl font-extrabold text-navy-900">{t("bulkTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("bulkText")}</p>
          <form onSubmit={(event) => void bulk(event)} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("role")}
              {roleSelect(bulkRole, setBulkRole)}
            </label>
            {(data.options.roles[bulkRole] ?? []).includes("mahalla_id") ? (
              <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
                {t("mahalla")}
                <select name="mahalla" className={FIELD} required>
                  {data.options.mahallas.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
              {t("partner")}
              <select name="partner" className={FIELD} defaultValue="">
                <option value="">{t("noPartner")}</option>
                {data.options.partners.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
            <textarea name="lines" rows={6} required placeholder={"+998901234567, Karimov Aziz\n+998901234568, Aliyeva Dilnoza"} className={`${FIELD} py-2 font-mono text-sm`} />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy}>{busy ? t("sending") : t("bulkSend")}</Button>
              {bulkNote ? (
                <p role="status" className={`text-sm font-semibold ${bulkNote.ok ? "text-success-600" : "text-danger-600"}`}>
                  {bulkNote.text}
                </p>
              ) : null}
            </div>
          </form>
        </section>
      </div>

      <section aria-labelledby="requests" className="flex flex-col gap-3">
        <h2 id="requests" className="text-xl font-extrabold text-navy-900">{t("requestsTitle")}</h2>
        <p className="text-sm text-muted">{t("requestsText")}</p>
        {data.requests.length === 0 ? (
          <EmptyState title={t("noRequests")} text="" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.requests.map((item) => (
              <li key={item.id} className={CARD}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">{item.org_name}</p>
                    <p className="text-xs text-muted">
                      {kinds(`kind.${item.kind}` as "kind.GOV")}
                      {item.country_code ? ` · ${countryName(item.country_code)}` : ""} · {item.created}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[item.status] ?? "gray"}>{t(`status.${item.status}` as "status.NEW")}</Badge>
                </div>
                <p className="mt-2 text-sm text-navy-900">
                  {item.contact_name} · <span className="tabular-nums">{item.phone}</span>
                  {item.email ? ` · ${item.email}` : ""}
                </p>
                {item.message ? <p className="mt-1 text-sm text-muted">{item.message}</p> : null}
                {item.status === "NEW" ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="rounded-xl bg-success-600 px-4 py-2 text-sm font-bold text-white" onClick={() => void decide(item.id, "APPROVED")}>
                      {t("approve")}
                    </button>
                    <button type="button" className="rounded-xl border border-line-strong px-4 py-2 text-sm font-bold text-navy-900 hover:border-danger-600 hover:text-danger-600" onClick={() => void decide(item.id, "REJECTED")}>
                      {t("reject")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="list" className="flex flex-col gap-3">
        <h2 id="list" className="text-xl font-extrabold text-navy-900">{t("listTitle")}</h2>
        {data.invitations.length === 0 ? (
          <EmptyState title={t("empty")} text="" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.invitations.map((item) => (
              <li key={item.id} className={`${CARD} flex flex-wrap items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <p className="font-bold text-navy-900">{item.full_name}</p>
                  <p className="text-sm text-muted">
                    <span className="tabular-nums">{item.phone}</span> · {roles(item.role as "mentor")}
                    {item.partner ? ` · ${item.partner}` : ""}
                    {item.mahalla ? ` · ${item.mahalla}` : ""}
                    {item.org_name ? ` · ${item.org_name}` : ""}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[item.status] ?? "gray"}>{t(`status.${item.status}` as "status.PENDING")}</Badge>
                    {item.status === "PENDING" ? <span className="text-xs text-muted">{t("until", { date: item.expires })}</span> : null}
                  </p>
                </div>
                {item.status === "PENDING" ? (
                  <button type="button" className="rounded-xl border border-line-strong px-3 py-1.5 text-sm font-bold text-navy-900 hover:border-danger-600 hover:text-danger-600" onClick={() => void revoke(item.id)}>
                    {t("revoke")}
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
