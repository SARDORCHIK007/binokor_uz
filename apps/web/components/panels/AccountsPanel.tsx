"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Tile, initials } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Account = { id: string; name: string; phone: string; active: boolean; last_login: string; created: string; roles: string[]; sessions: number };
type List = { total: number; page: number; size: number; assignable: string[]; items: Account[] };
type Health = { stats: Record<string, number>; by_role: { role: string; n: number }[] };

const HEALTH = ["users", "blocked", "new_week", "active_day", "sessions", "invites", "firms", "portfolio", "partner_requests", "certificates", "audit_day", "db_mb"] as const;

export function AccountsPanel() {
  const t = useTranslations("ac");
  const roleNames = useTranslations("roles");
  const [health, setHealth] = useState<Health | null>(null);
  const [data, setData] = useState<List | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const label = (id: string) => (roleNames.has(id as "admin") ? roleNames(id as "admin") : id);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ q: query, role, state, page: String(page) });
    const [list, status] = await Promise.all([send<List>(`/api/v1/admin/accounts?${params.toString()}`, "GET"), send<Health>("/api/v1/admin/accounts/health", "GET")]);
    if (list.ok && list.data) setData(list.data);
    else setFailed(true);
    if (status.ok && status.data) setHealth(status.data);
  }, [query, role, state, page]);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  async function act(request: Promise<{ ok: boolean }>) {
    const result = await request;
    setNote(result.ok ? { ok: true, text: t("saved") } : { ok: false, text: t("failed") });
    if (result.ok) {
      setBlocking(null);
      setReason("");
      await load();
    }
  }

  const pages = Math.max(1, Math.ceil(data.total / data.size));
  const label2 = "flex flex-col gap-1 text-sm font-semibold text-muted";

  return (
    <div className="flex flex-col gap-6">
      {health ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {HEALTH.map((key) => (
              <Tile key={key} label={t(`h.${key}`)} value={health.stats[key] ?? 0} tone={["blocked", "firms", "portfolio", "partner_requests", "certificates"].includes(key) && (health.stats[key] ?? 0) > 0 ? "amber" : "blue"} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/kabinet/moderatsiya/jurnal" className={buttonClass({ variant: "secondary" })}>{t("audit")}</Link>
            <Link href="/kabinet/taklifnomalar" className={buttonClass({ variant: "secondary" })}>{t("invites")}</Link>
          </div>
        </>
      ) : null}

      <div className={`${CARD} grid gap-3 md:grid-cols-3`}>
        <label className={label2}>
          {t("search")}
          <input type="search" className={FIELD} value={q} onChange={(event) => { setQ(event.target.value); setPage(1); setQuery(event.target.value); }} />
        </label>
        <label className={label2}>
          {t("role")}
          <select className={FIELD} value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
            <option value="">{t("any")}</option>
            {(health?.by_role ?? []).map((item) => <option key={item.role} value={item.role}>{label(item.role)} · {item.n}</option>)}
          </select>
        </label>
        <label className={label2}>
          {t("state")}
          <select className={FIELD} value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}>
            <option value="">{t("any")}</option>
            <option value="active">{t("active")}</option>
            <option value="blocked">{t("blocked")}</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted">{t("total", { n: data.total })}</p>
        {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}
      </div>

      {data.items.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((account) => (
            <li key={account.id} className={`${CARD} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">{initials(account.name)}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-navy-900">{account.name} {account.active ? null : <Badge tone="red">{t("blockedBadge")}</Badge>}</p>
                    <p className="text-xs text-muted">{account.phone} · {account.last_login ? t("lastLogin", { day: account.last_login }) : t("never")} · {t("sessions", { n: account.sessions })}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {account.roles.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1">
                      <Badge tone={r === "admin" || r === "superadmin" ? "blue" : "gray"}>{label(r)}</Badge>
                      {data.assignable.includes(r) ? (
                        <button type="button" aria-label={`${t("removeRole")}: ${label(r)}`} className="text-xs font-bold text-danger-600 hover:underline" onClick={() => void act(send(`/api/v1/admin/accounts/${account.id}/roles`, "POST", { role: r, grant: false }))}>✕</button>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
              {blocking === account.id ? (
                <div className="flex flex-col gap-2">
                  <label className={label2}>
                    {t("reason")}
                    <input className={FIELD} value={reason} onChange={(event) => setReason(event.target.value)} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={buttonClass()} onClick={() => void act(send(`/api/v1/admin/accounts/${account.id}/active`, "POST", { active: false, reason }))}>{t("confirmBlock")}</button>
                    <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => { setBlocking(null); setReason(""); }}>{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={t("addRole")}
                    className={`${FIELD} !w-auto`}
                    value=""
                    onChange={(event) => event.target.value && void act(send(`/api/v1/admin/accounts/${account.id}/roles`, "POST", { role: event.target.value, grant: true }))}
                  >
                    <option value="">{t("addRole")}…</option>
                    {data.assignable.filter((r) => !account.roles.includes(r)).map((r) => <option key={r} value={r}>{label(r)}</option>)}
                  </select>
                  {account.active ? (
                    <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setBlocking(account.id)}>{t("block")}</button>
                  ) : (
                    <button type="button" className={buttonClass()} onClick={() => void act(send(`/api/v1/admin/accounts/${account.id}/active`, "POST", { active: true }))}>{t("unblock")}</button>
                  )}
                  {account.sessions > 0 ? <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void act(send(`/api/v1/admin/accounts/${account.id}/sessions/end`, "POST"))}>{t("endSessions")}</button> : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 ? (
        <div className="flex items-center gap-3">
          <button type="button" className={buttonClass({ variant: "secondary" })} disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("prev")}</button>
          <span className="text-sm tabular-nums text-muted">{page} / {pages}</span>
          <button type="button" className={buttonClass({ variant: "secondary" })} disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("next")}</button>
        </div>
      ) : null}
    </div>
  );
}
