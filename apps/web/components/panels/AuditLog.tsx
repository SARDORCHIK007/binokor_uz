"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Log = {
  total: number;
  page: number;
  size: number;
  entities: string[];
  items: { id: number; action: string; entity: string; entity_id: string | null; detail: Record<string, unknown>; at: string; role: string | null; who: string | null }[];
};

const DAYS = [1, 7, 30, 90, 365];

export function AuditLog() {
  const t = useTranslations("au");
  const [data, setData] = useState<Log | null>(null);
  const [failed, setFailed] = useState(false);
  const [entity, setEntity] = useState("");
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const query = new URLSearchParams({ days: String(days), page: String(page) });
    if (entity) query.set("entity", entity);
    const result = await send<Log>(`/api/v1/moderation/audit?${query.toString()}`, "GET");
    if (result.ok && result.data) setData(result.data);
    else setFailed(true);
  }, [entity, days, page]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("empty")}</p>;
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / data.size));

  return (
    <div className="flex flex-col gap-4">
      <div className={`${CARD} grid gap-3 sm:grid-cols-2`}>
        <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
          {t("entity")}
          <select className={FIELD} value={entity} onChange={(event) => { setEntity(event.target.value); setPage(1); }}>
            <option value="">—</option>
            {data.entities.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
          {t("period")}
          <select className={FIELD} value={days} onChange={(event) => { setDays(Number(event.target.value)); setPage(1); }}>
            {DAYS.map((n) => <option key={n} value={n}>{t("days", { n })}</option>)}
          </select>
        </label>
      </div>
      <p className="text-sm font-semibold text-muted">{t("total", { n: data.total })}</p>
      {data.items.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.items.map((entry) => (
            <li key={entry.id} className={`${CARD} flex flex-wrap items-start justify-between gap-3 py-3`}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-bold text-navy-900">
                  <Badge tone="blue">{entry.entity}</Badge>
                  {entry.action}
                </p>
                <p className="text-xs text-muted">{entry.who ?? t("system")}{entry.role ? ` · ${entry.role}` : ""} · {entry.at}</p>
                {typeof entry.detail.reason === "string" ? <p className="mt-1 text-sm text-navy-900">{t("reason", { text: entry.detail.reason })}</p> : null}
              </div>
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
