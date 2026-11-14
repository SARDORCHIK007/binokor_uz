"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Tile, type Tone } from "@/components/cabinet/kit";
import { send } from "@/lib/clientApi";

type Order = { id: string; order_no: string; buyer_name: string; company: boolean; delivery: string; comment: string | null; quantity: number; unit: string; status: string; created: string; product: string };

const STATUSES = ["NEW", "CONTACTED", "DONE", "CANCELLED"] as const;
const TONE: Record<string, Tone> = { NEW: "blue", CONTACTED: "amber", DONE: "green", CANCELLED: "gray" };

export function OrdersBoard() {
  const t = useTranslations("ob");
  const [rows, setRows] = useState<Order[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await send<Order[]>("/api/v1/admin/orders", "GET");
    if (result.ok && result.data) setRows(result.data);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!rows) return null;

  async function move(id: string, status: string) {
    const result = await send(`/api/v1/admin/orders/${id}/status`, "POST", { status });
    setNote(result.ok ? null : t("failed"));
    await load();
  }

  const shown = rows.filter((row) => !filter || row.status === filter);
  const count = (status: string) => rows.filter((row) => row.status === status).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATUSES.map((status) => (
          <Tile key={status} label={t(`s.${status}`)} value={count(status)} tone={TONE[status]} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {["", ...STATUSES].map((status) => (
          <button key={status || "all"} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${filter === status ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}>
            {status ? t(`s.${status}` as "s.NEW") : `${t("all")} · ${rows.length}`}
          </button>
        ))}
      </div>
      {note ? <p role="alert" className="text-sm font-semibold text-danger-600">{note}</p> : null}
      {shown.length === 0 ? (
        <EmptyState title={t("empty")} text={t("emptyText")} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {shown.map((order) => (
            <li key={order.id} className={`${CARD} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-navy-900">{order.product} · {order.quantity} {order.unit}</p>
                  <p className="text-sm text-muted">{order.buyer_name} · {order.company ? t("company") : t("person")}</p>
                  <p className="text-xs text-muted">{t("no", { n: order.order_no })} · {order.created} · {t(order.delivery as "PICKUP")}</p>
                </div>
                <Badge tone={TONE[order.status] ?? "gray"}>{t(`s.${order.status}` as "s.NEW")}</Badge>
              </div>
              {order.comment ? <p className="rounded-xl bg-surface-100 p-3 text-sm text-navy-900">{order.comment}</p> : null}
              {order.status === "NEW" || order.status === "CONTACTED" ? (
                <div className="flex flex-wrap gap-2">
                  {order.status === "NEW" ? <button type="button" className={buttonClass()} onClick={() => void move(order.id, "CONTACTED")}>{t("contact")}</button> : null}
                  <button type="button" className={buttonClass()} onClick={() => void move(order.id, "DONE")}>{t("done")}</button>
                  <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void move(order.id, "CANCELLED")}>{t("cancel")}</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
