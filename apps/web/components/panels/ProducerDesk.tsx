"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Meter, Tile } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Desk = {
  company: { name: string; verified: boolean; completeness: number };
  kpi: Record<string, number | null>;
  orders: { id: string; order_no: string; buyer: string; company: boolean; quantity: number; unit: string; product: string; created: string; note: string | null; status: string; late: boolean }[];
  products: { id: string; name: string; unit: string; stock_qty: number | null; low_at: number | null; in_stock: boolean; price: number | null; price_day: string; stale: boolean; low: boolean }[];
  buyers: { name: string; orders: number; total: number }[];
};

const money = (value: number) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export function ProducerDesk() {
  const t = useTranslations("pd");
  const locale = useLocale();
  const [data, setData] = useState<Desk | null>(null);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [stock, setStock] = useState<Record<string, { qty: string; low: string }>>({});

  const load = useCallback(async () => {
    const result = await send<Desk>(`/api/v1/producers/desk?lang=${locale}`, "GET");
    if (result.ok && result.data) setData(result.data);
    else setFailed(true);
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  const report = (ok: boolean) => setNote({ ok, text: ok ? t("saved") : t("failed") });

  async function status(id: string, value: string) {
    report((await send(`/api/v1/producers/orders/${id}/status`, "POST", { status: value })).ok);
    await load();
  }

  async function saveNote(id: string) {
    report((await send(`/api/v1/producers/orders/${id}/note`, "POST", { note: notes[id] ?? "" })).ok);
    await load();
  }

  async function saveStock(id: string) {
    const entry = stock[id];
    if (!entry) return;
    const num = (value: string) => (value.trim() === "" ? null : Number(value));
    report((await send(`/api/v1/producers/products/${id}/stock`, "POST", { stock_qty: num(entry.qty), low_stock_at: num(entry.low) })).ok);
    await load();
  }

  const k = data.kpi;
  const attention = data.products.filter((p) => !p.in_stock || p.low || p.stale);

  return (
    <div className="flex flex-col gap-6">
      {data.company.verified ? null : <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-navy-900">{t("unverified")}</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label={t("kpi.new_orders")} value={k.new_orders ?? 0} tone="blue" />
        <Tile label={t("kpi.late")} value={k.late ?? 0} tone={(k.late ?? 0) > 0 ? "red" : "gray"} />
        <Tile label={t("kpi.in_progress")} value={k.in_progress ?? 0} tone="amber" />
        <Tile label={t("kpi.done_month")} value={k.done_month ?? 0} tone="green" />
        <Tile label={t("kpi.revenue_month")} value={money(k.revenue_month ?? 0)} tone="green" />
        <Tile label={t("kpi.response_hours")} value={k.response_hours ?? "—"} tone="gray" />
        <Tile label={t("kpi.out_of_stock")} value={k.out_of_stock ?? 0} tone={(k.out_of_stock ?? 0) > 0 ? "amber" : "gray"} />
        <Tile label={t("kpi.stale_prices")} value={k.stale_prices ?? 0} tone={(k.stale_prices ?? 0) > 0 ? "amber" : "gray"} />
      </div>
      <div className={`${CARD} flex flex-wrap items-center gap-4`}>
        <div className="min-w-48 flex-1">
          <p className="text-sm font-semibold text-muted">{t("complete", { n: data.company.completeness })}</p>
          <Meter value={data.company.completeness} tone={data.company.completeness >= 70 ? "green" : "amber"} label={t("complete", { n: data.company.completeness })} />
        </div>
        <Link href="/kabinet/korxona" className={buttonClass({ variant: "secondary" })}>{t("fill")}</Link>
        <Link href="/kabinet/mahsulotlar" className={buttonClass({ variant: "secondary" })}>{t("allProducts")}</Link>
        <Link href="/kabinet/statistika" className={buttonClass({ variant: "secondary" })}>{t("stats")}</Link>
      </div>
      {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}

      <section aria-labelledby="pd-orders" className="flex flex-col gap-3">
        <h2 id="pd-orders" className="text-xl font-extrabold text-navy-900">{t("orders")}</h2>
        {data.orders.length === 0 ? (
          <EmptyState title={t("noOrders")} text="" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.orders.map((order) => (
              <li key={order.id} className={`${CARD} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">{order.product} · {order.quantity} {order.unit}</p>
                    <p className="text-sm text-muted">{order.buyer} · {order.company ? t("company") : t("person")} · {order.created}</p>
                  </div>
                  <p className="flex flex-wrap gap-1.5">
                    {order.late ? <Badge tone="red">{t("late")}</Badge> : null}
                    <Badge tone={order.status === "NEW" ? "blue" : "amber"}>{t(`status.${order.status}` as "status.NEW")}</Badge>
                  </p>
                </div>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                  {t("note")}
                  <input className={FIELD} value={notes[order.id] ?? order.note ?? ""} onChange={(event) => setNotes({ ...notes, [order.id]: event.target.value })} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void saveNote(order.id)}>{t("saveNote")}</button>
                  {order.status === "NEW" ? <button type="button" className={buttonClass()} onClick={() => void status(order.id, "CONTACTED")}>{t("contact")}</button> : null}
                  <button type="button" className={buttonClass()} onClick={() => void status(order.id, "DONE")}>{t("done")}</button>
                  <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void status(order.id, "CANCELLED")}>{t("cancel")}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="pd-stock" className={CARD}>
          <h2 id="pd-stock" className="text-lg font-extrabold text-navy-900">{t("stock")}</h2>
          <p className="mt-1 text-sm text-muted">{t("stockText")}</p>
          <ul className="mt-3 divide-y divide-line">
            {(attention.length > 0 ? attention : data.products.slice(0, 8)).map((p) => {
              const entry = stock[p.id] ?? { qty: p.stock_qty === null ? "" : String(p.stock_qty), low: p.low_at === null ? "" : String(p.low_at) };
              return (
                <li key={p.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-navy-900">{p.name}</p>
                    <p className="flex flex-wrap gap-1.5">
                      {!p.in_stock ? <Badge tone="red">{t("out")}</Badge> : p.low ? <Badge tone="amber">{t("low")}</Badge> : null}
                      {p.stale ? <Badge tone="amber">{t("stale")}</Badge> : null}
                    </p>
                  </div>
                  <p className="text-xs text-muted">{t("priceAge", { day: p.price_day })}</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex w-28 flex-col gap-1 text-xs font-semibold text-muted">
                      {t("qty")} ({p.unit})
                      <input type="number" min="0" className={FIELD} value={entry.qty} onChange={(event) => setStock({ ...stock, [p.id]: { ...entry, qty: event.target.value } })} />
                    </label>
                    <label className="flex w-32 flex-col gap-1 text-xs font-semibold text-muted">
                      {t("lowAt")}
                      <input type="number" min="0" className={FIELD} value={entry.low} onChange={(event) => setStock({ ...stock, [p.id]: { ...entry, low: event.target.value } })} />
                    </label>
                    <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void saveStock(p.id)}>{t("saveStock")}</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section aria-labelledby="pd-buyers" className={`${CARD} self-start`}>
          <h2 id="pd-buyers" className="text-lg font-extrabold text-navy-900">{t("buyers")}</h2>
          {data.buyers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">—</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.buyers.map((b) => (
                <li key={b.name} className="py-2 text-sm">
                  <p className="font-bold text-navy-900">{b.name}</p>
                  <p className="text-xs text-muted">{t("buyerRow", { n: b.orders, sum: money(b.total) })}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
