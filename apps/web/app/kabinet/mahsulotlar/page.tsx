"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/Icon";

type Product = {
  id: string;
  name: string;
  unit: string;
  price: string | null;
  min_order: number | null;
  in_stock: boolean;
  category: string;
};
type Category = { code: string; name: string };
type Order = {
  id: string;
  order_no: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_type: "PERSON" | "COMPANY";
  company_name: string | null;
  company_inn: string | null;
  delivery: "PICKUP" | "DELIVERY";
  address: string | null;
  comment: string | null;
  quantity: number;
  unit: string;
  price: number | null;
  status: string;
  created_at: string;
  product: string;
};

const UNITS = ["dona", "qop", "m³", "m²", "tonna", "kg", "metr", "rulon", "chelak", "list", "1000 dona"];
const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";
const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6";
const STATUS_TONE: Record<string, string> = {
  NEW: "bg-blue-100 text-primary",
  CONTACTED: "bg-warning-100 text-warning-600",
  DONE: "bg-success-100 text-success-600",
  CANCELLED: "bg-danger-100 text-danger-600",
};

function money(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function send(url: string, method: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export default function ProductsPage() {
  const t = useTranslations("producerCab");
  const states = useTranslations("states");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [failed, setFailed] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/producers/products", { credentials: "include" });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    setProducts((await response.json()) as Product[]);
    const incoming = await fetch("/api/v1/producers/orders", { credentials: "include" });
    if (incoming.ok) {
      setOrders((await incoming.json()) as Order[]);
    }
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/v1/producers/categories")
      .then((response) => response.json())
      .then((rows: Category[]) => setCategories(rows))
      .catch(() => setCategories([]));
  }, [load]);

  // Marketplace orders arrive as one row per product; group them by order number.
  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      map.set(order.order_no, [...(map.get(order.order_no) ?? []), order]);
    }
    return [...map.values()];
  }, [orders]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await send("/api/v1/producers", "POST", { name: form.get("company"), inn: form.get("inn") });
    setNote({ text: response.ok ? t("saved") : t("failed"), ok: response.ok });
    await load();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await send("/api/v1/producers/products", "POST", {
      name: form.get("name"),
      category: form.get("category"),
      unit: form.get("unit"),
      price: Number(form.get("price")),
      min_order: form.get("min_order") ? Number(form.get("min_order")) : null,
      in_stock: form.get("in_stock") === "on",
    });
    setNote({ text: response.ok ? t("added") : t("failed"), ok: response.ok });
    if (response.ok) {
      formElement.reset();
      await load();
    }
  }

  async function save(product: Product, patch: Partial<Product> & { price?: string }) {
    const next = { ...product, ...patch };
    const response = await send(`/api/v1/producers/products/${product.id}`, "PATCH", {
      name: next.name,
      category: next.category,
      unit: next.unit,
      price: Number(next.price ?? 0),
      min_order: next.min_order,
      in_stock: next.in_stock,
    });
    setNote({ text: response.ok ? t("saved") : t("failed"), ok: response.ok });
    await load();
  }

  async function remove(id: string) {
    const response = await send(`/api/v1/producers/products/${id}`, "DELETE");
    setNote({ text: response.ok ? t("saved") : t("deleteFailed"), ok: response.ok });
    await load();
  }

  async function mark(order: Order[], status: string) {
    await Promise.all(order.map((line) => send(`/api/v1/producers/orders/${line.id}/status`, "POST", { status })));
    await load();
  }

  if (failed) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  if (!products) {
    return <div className="h-64 animate-pulse rounded-2xl bg-card" aria-label={states("loading")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
      {note ? (
        <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${note.ok ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"}`}>
          {note.text}
        </p>
      ) : null}

      {products.length === 0 && orders.length === 0 ? (
        <form onSubmit={register} className={`${CARD} grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
          <h2 className="text-lg font-bold text-navy-900 sm:col-span-3">{t("registerTitle")}</h2>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("company")}
            <input name="company" required minLength={2} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("inn")}
            <input name="inn" required minLength={9} maxLength={14} inputMode="numeric" className={FIELD} />
          </label>
          <button type="submit" className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover">
            {t("register")}
          </button>
        </form>
      ) : null}

      <form onSubmit={create} className={`${CARD} grid gap-4 md:grid-cols-6`}>
        <h2 className="text-xl font-bold text-navy-900 md:col-span-6">{t("addTitle")}</h2>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-3">
          {t("name")}
          <input name="name" required minLength={2} maxLength={200} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-3">
          {t("category")}
          <select name="category" required className={FIELD}>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
          {t("unit")}
          <select name="unit" className={FIELD} defaultValue="dona">
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
          {t("price")}
          <input name="price" type="number" min={0} step="any" required className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
          {t("minOrder")}
          <input name="min_order" type="number" min={0} step="any" className={FIELD} />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-navy-900 md:col-span-3">
          <input name="in_stock" type="checkbox" defaultChecked className="size-4 accent-primary" />
          {t("inStock")}
        </label>
        <div className="md:col-span-3 md:text-right">
          <button type="submit" className="min-h-11 w-full rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover md:w-auto">
            {t("add")}
          </button>
        </div>
      </form>

      <section className={CARD}>
        <h2 className="text-xl font-bold text-navy-900">{t("products")}</h2>
        {products.length === 0 ? <p className="mt-3 text-sm text-muted">{t("noProducts")}</p> : null}
        <ul className="mt-4 divide-y divide-line">
          {products.map((item) => (
            <ProductRow key={item.id} item={item} onSave={save} onDelete={remove} t={t} />
          ))}
        </ul>
      </section>

      <section className={CARD}>
        <h2 className="text-xl font-bold text-navy-900">{t("orders")}</h2>
        {grouped.length === 0 ? <p className="mt-3 text-sm text-muted">{t("noOrders")}</p> : null}
        <ul className="mt-4 flex flex-col gap-3">
          {grouped.map((lines) => {
            const head = lines[0];
            const total = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.quantity, 0);
            const open = !["DONE", "CANCELLED"].includes(head.status);
            return (
              <li key={head.order_no} className="rounded-xl border border-line bg-canvas p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-navy-900">{head.order_no}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_TONE[head.status] ?? ""}`}>{t(`status.${head.status}` as "status.NEW")}</span>
                  <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                    {head.buyer_type === "COMPANY" ? t("companyBuyer") : t("person")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-muted">
                    <Icon name={head.delivery === "DELIVERY" ? "truck" : "factory"} className="size-3.5" />
                    {head.delivery === "DELIVERY" ? t("delivery") : t("pickup")}
                  </span>
                  <time dateTime={head.created_at} className="ml-auto text-xs text-muted tabular-nums">{head.created_at.slice(0, 10)}</time>
                </div>
                <p className="mt-2 text-sm text-navy-900">
                  <strong>{head.company_name ?? head.buyer_name}</strong>
                  {head.company_inn ? ` · ${t("inn")} ${head.company_inn}` : ""}
                  {head.company_name ? ` · ${head.buyer_name}` : ""} ·{" "}
                  <a href={`tel:${head.buyer_phone}`} className="font-semibold text-primary hover:underline">{head.buyer_phone}</a>
                </p>
                {head.address ? <p className="mt-0.5 text-xs text-muted">{head.address}</p> : null}
                <ul className="mt-2 text-sm text-body">
                  {lines.map((line) => (
                    <li key={line.id}>• {line.product}: {line.quantity} {line.unit}</li>
                  ))}
                </ul>
                {head.comment ? <p className="mt-1 text-xs text-muted">{t("comment")}: {head.comment}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {total > 0 ? <span className="text-sm text-muted">{t("total")}: <strong className="tabular-nums text-navy-900">{money(total)} so&apos;m</strong></span> : null}
                  {open ? (
                    <span className="ml-auto flex flex-wrap gap-2">
                      {head.status === "NEW" ? (
                        <button type="button" onClick={() => void mark(lines, "CONTACTED")} className="min-h-9 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover">{t("markContacted")}</button>
                      ) : null}
                      <button type="button" onClick={() => void mark(lines, "DONE")} className="min-h-9 rounded-xl bg-success-600 px-4 text-sm font-bold text-white hover:bg-teal-700">{t("markDone")}</button>
                      <button type="button" onClick={() => void mark(lines, "CANCELLED")} className="min-h-9 rounded-xl border border-line-strong px-4 text-sm font-semibold text-muted hover:text-danger-600">{t("markCancel")}</button>
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ProductRow({
  item,
  onSave,
  onDelete,
  t,
}: {
  item: Product;
  onSave: (product: Product, patch: Partial<Product> & { price?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
}) {
  const [price, setPrice] = useState(String(Math.round(Number(item.price ?? 0))));
  const changed = price !== String(Math.round(Number(item.price ?? 0)));
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-navy-900">{item.name}</p>
        <p className="text-xs text-muted">
          {item.category} · {item.unit}
          {item.min_order ? ` · min ${item.min_order}` : ""}
        </p>
      </div>
      <label className="sr-only" htmlFor={`price-${item.id}`}>{t("price")}</label>
      <input
        id={`price-${item.id}`}
        type="number"
        min={0}
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        className="h-10 w-32 rounded-xl border border-line-strong px-3 text-right text-sm tabular-nums"
      />
      <button type="button" disabled={!changed} onClick={() => void onSave(item, { price })} className="min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-40">
        {t("save")}
      </button>
      <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
        <input type="checkbox" checked={item.in_stock} onChange={(event) => void onSave(item, { in_stock: event.target.checked })} className="size-4 accent-primary" />
        {t("inStock")}
      </label>
      <button type="button" onClick={() => void onDelete(item.id)} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-danger-100 hover:text-danger-600">
        {t("delete")}
      </button>
    </li>
  );
}
