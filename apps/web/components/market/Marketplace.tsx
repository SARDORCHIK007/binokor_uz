"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";

export type MarketItem = {
  id: string;
  name: string;
  unit: string;
  price: number | null;
  min_order: number | null;
  in_stock: boolean;
  featured: boolean;
  stale: boolean;
  orders: number;
  category: string;
  category_name: string;
  producer: { id: string; name: string; verified: boolean };
};
export type Facets = {
  categories: { code: string; name: string; count: number }[];
  producers: { id: string; name: string; address: string; verified: boolean; count: number }[];
  price: { min: number | null; max: number | null };
};
export type MarketPage = { items: MarketItem[]; total: number; facets: Facets };

type CartLine = { id: string; name: string; unit: string; price: number | null; min: number; qty: number };
type Filters = { q: string; category: string; producer: string; min: string; max: string; inStock: boolean; sort: string };

const PAGE = 12;
const CART_KEY = "ub-market-cart";
const SORTS = ["featured", "popular", "price_asc", "price_desc", "name"] as const;
const EMPTY: Filters = { q: "", category: "", producer: "", min: "", max: "", inStock: false, sort: "featured" };
const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";

export const CATEGORY_ICON: Record<string, IconName> = {
  cement: "box",
  bricks: "brick",
  aggregates: "hill",
  concrete: "pillar",
  metal: "bars",
  wood: "wood",
  roofing: "roof",
  insulation: "snow",
  finishing: "brush",
  flooring: "tile",
  doors: "door",
  plumbing: "drop",
  electrical: "bolt",
  fasteners: "screw",
};

export function money(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function query(filters: Filters, offset: number): string {
  const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset), sort: filters.sort });
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.category) params.set("category", filters.category);
  if (filters.producer) params.set("producer", filters.producer);
  if (filters.min) params.set("min_price", filters.min);
  if (filters.max) params.set("max_price", filters.max);
  if (filters.inStock) params.set("in_stock", "true");
  return params.toString();
}

function readCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function Marketplace({ initial }: { initial: MarketPage }) {
  const t = useTranslations("market");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [items, setItems] = useState<MarketItem[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [facets, setFacets] = useState<Facets>(initial.facets);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const first = useRef(true);

  useEffect(() => setCart(readCart()), []);
  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* storage may be blocked; the cart still works for this visit */
    }
  }, [cart]);

  const load = useCallback(async (next: Filters, offset: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/public/market?${query(next, offset)}`);
      if (!response.ok) return;
      const body = (await response.json()) as MarketPage;
      setItems((prev) => (offset === 0 ? body.items : [...prev, ...body.items]));
      setTotal(body.total);
      setFacets(body.facets);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch on filter change (debounced for the text and price fields).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = window.setTimeout(() => void load(filters, 0), 250);
    return () => window.clearTimeout(timer);
  }, [filters, load]);

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((prev) => ({ ...prev, [key]: value }));
  const inCart = useMemo(() => new Map(cart.map((line) => [line.id, line])), [cart]);
  const cartCount = cart.length;
  const cartTotal = cart.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0);

  function add(item: MarketItem) {
    const min = item.min_order ?? 1;
    setCart((prev) =>
      prev.some((line) => line.id === item.id)
        ? prev
        : [...prev, { id: item.id, name: item.name, unit: item.unit, price: item.price, min, qty: min }],
    );
  }
  function setQty(id: string, qty: number) {
    setCart((prev) => prev.map((line) => (line.id === id ? { ...line, qty: Math.max(line.min, Math.round(qty * 100) / 100) } : line)));
  }
  function remove(id: string) {
    setCart((prev) => prev.filter((line) => line.id !== id));
  }
  const active = filters.q || filters.category || filters.producer || filters.min || filters.max || filters.inStock;

  const sidebar = (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
        {t("search")}
        <input type="search" value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder={t("searchPlaceholder")} className={FIELD} />
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold text-navy-900">{t("producer")}</legend>
        {[{ id: "", name: t("anyProducer"), verified: false, count: 0, address: "" }, ...facets.producers].map((producer) => (
          <label key={producer.id || "all"} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2 text-sm text-navy-900 hover:bg-canvas">
            <input type="radio" name="producer" className="accent-primary" checked={filters.producer === producer.id} onChange={() => set("producer", producer.id)} />
            <span className="min-w-0 flex-1 truncate">{producer.name}</span>
            {producer.id ? <span className="text-xs tabular-nums text-muted">{producer.count}</span> : null}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-navy-900">{t("price")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <input inputMode="numeric" value={filters.min} onChange={(e) => set("min", e.target.value.replace(/\D/g, ""))} placeholder={`${t("from")} ${money(facets.price.min)}`} aria-label={`${t("price")} ${t("from")}`} className={FIELD} />
          <input inputMode="numeric" value={filters.max} onChange={(e) => set("max", e.target.value.replace(/\D/g, ""))} placeholder={`${t("to")} ${money(facets.price.max)}`} aria-label={`${t("price")} ${t("to")}`} className={FIELD} />
        </div>
      </fieldset>
      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm font-semibold text-navy-900">
        <input type="checkbox" className="size-4 accent-primary" checked={filters.inStock} onChange={(e) => set("inStock", e.target.checked)} />
        {t("inStock")}
      </label>
      {active ? (
        <button type="button" onClick={() => setFilters({ ...EMPTY, sort: filters.sort })} className="min-h-10 rounded-xl border border-line-strong text-sm font-bold text-navy-900 hover:border-primary hover:text-primary">
          {t("reset")}
        </button>
      ) : null}
    </div>
  );

  return (
    <section id="katalog" className="scroll-mt-20">
      {/* Category chips */}
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => set("category", "")}
          aria-pressed={!filters.category}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${!filters.category ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
        >
          {t("allCategories")}
        </button>
        {facets.categories.map((category) => {
          const on = filters.category === category.code;
          return (
            <button
              key={category.code}
              type="button"
              onClick={() => set("category", on ? "" : category.code)}
              aria-pressed={on}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${on ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
            >
              <Icon name={CATEGORY_ICON[category.code] ?? "box"} className="size-4" />
              {category.name}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? "bg-white/20" : "bg-surface-100 text-muted"}`}>{category.count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="hidden self-start rounded-2xl border border-line bg-card p-5 shadow-sh1 xl:sticky xl:top-20 xl:block" aria-label={t("filters")}>
          {sidebar}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted" aria-live="polite">
              {loading ? t("loading") : t("found", { count: total })}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-card px-3.5 text-sm font-semibold text-navy-900 xl:hidden">
                <Icon name="filter" className="size-4" /> {t("filters")}
              </button>
              <label className="flex items-center gap-2 text-sm text-muted">
                <span className="hidden sm:inline">{t("sortLabel")}</span>
                <select value={filters.sort} onChange={(e) => set("sort", e.target.value)} className="min-h-10 rounded-xl border border-line-strong bg-card px-3 text-sm font-semibold text-navy-900">
                  {SORTS.map((sort) => (
                    <option key={sort} value={sort}>
                      {t(`sort.${sort}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {items.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-line-strong bg-card p-12 text-center">
              <p className="text-lg font-bold text-navy-900">{t("nothing")}</p>
              <p className="mt-1 text-sm text-muted">{t("nothingText")}</p>
            </div>
          ) : (
            <ul className={`grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 ${loading ? "opacity-60" : ""}`}>
              {items.map((item) => {
                const line = inCart.get(item.id);
                return (
                  <li key={item.id} className="flex flex-col rounded-2xl border border-line bg-card p-4 shadow-sh1 transition hover:border-primary/40 hover:shadow-sh2">
                    <div className="flex items-start gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary ring-1 ring-blue-100">
                        <Icon name={CATEGORY_ICON[item.category] ?? "box"} className="size-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">
                          <span className="truncate">{item.category_name}</span>
                          {item.featured ? (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[10px] tracking-normal text-warning-600 normal-case">★ {t("featured")}</span>
                          ) : null}
                        </p>
                        <h3 className="mt-0.5 line-clamp-2 text-base leading-snug font-bold text-navy-900">{item.name}</h3>
                      </div>
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-muted">
                      <Icon name="factory" className="size-3.5 shrink-0 text-primary" />
                      <span className="truncate">{item.producer.name}</span>
                      {item.producer.verified ? <Icon name="check" className="size-3.5 shrink-0 text-success-600" /> : null}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        {item.price === null ? (
                          <p className="text-sm font-bold text-navy-900">{t("priceOnRequest")}</p>
                        ) : (
                          <p className="text-xl leading-tight font-extrabold tabular-nums text-navy-900">
                            {money(item.price)} <span className="text-xs font-semibold text-muted">{t("perUnit", { unit: item.unit })}</span>
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted">
                          {item.min_order ? t("minOrder", { count: item.min_order, unit: item.unit }) : null}
                          {item.stale ? <span className="ml-1 text-warning-600">· {t("stale")}</span> : null}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto pt-4">
                      {!item.in_stock ? (
                        <p className="rounded-xl bg-surface-100 py-2.5 text-center text-sm font-semibold text-muted">{t("outOfStock")}</p>
                      ) : line ? (
                        <div className="flex items-center gap-2">
                          <div className="flex flex-1 items-center rounded-xl border border-primary/40 bg-blue-50">
                            <button type="button" onClick={() => setQty(item.id, line.qty - line.min)} aria-label={t("decrease")} className="grid size-10 place-items-center text-primary">
                              <Icon name="minus" className="size-4" />
                            </button>
                            <span className="flex-1 text-center text-sm font-bold tabular-nums text-navy-900">
                              {line.qty} {item.unit}
                            </span>
                            <button type="button" onClick={() => setQty(item.id, line.qty + line.min)} aria-label={t("increase")} className="grid size-10 place-items-center text-primary">
                              <Icon name="plus" className="size-4" />
                            </button>
                          </div>
                          <button type="button" onClick={() => remove(item.id)} aria-label={t("remove")} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-danger-100 hover:text-danger-600">
                            <Icon name="close" className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => add(item)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-hover">
                          <Icon name="cart" className="size-4" /> {t("addToCart")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {items.length < total ? (
            <div className="mt-6 text-center">
              <button type="button" disabled={loading} onClick={() => void load(filters, items.length)} className="min-h-11 rounded-xl border border-line-strong bg-card px-6 text-sm font-bold text-navy-900 hover:border-primary hover:text-primary disabled:opacity-50">
                {t("showMore", { count: total - items.length })}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile filters sheet */}
      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex xl:hidden" role="dialog" aria-modal="true" aria-label={t("filters")}>
          <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={() => setFiltersOpen(false)} aria-label={t("close")} />
          <div className="relative ml-auto flex h-full w-full max-w-sm flex-col overflow-y-auto bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy-900">{t("filters")}</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label={t("close")} className="grid size-10 place-items-center rounded-xl hover:bg-canvas">
                <Icon name="close" className="size-5" />
              </button>
            </div>
            {sidebar}
            <button type="button" onClick={() => setFiltersOpen(false)} className="mt-6 min-h-11 rounded-xl bg-primary text-sm font-bold text-white">
              {t("found", { count: total })}
            </button>
          </div>
        </div>
      ) : null}

      {/* Floating cart button */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed right-4 bottom-20 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-sh3 hover:bg-primary-hover lg:bottom-6"
      >
        <Icon name="cart" className="size-5" />
        {t("cart")}
        {cartCount > 0 ? <span className="grid min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs text-navy-900 tabular-nums">{cartCount}</span> : null}
      </button>

      {cartOpen ? (
        <CartDrawer
          cart={cart}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onQty={setQty}
          onRemove={remove}
          onDone={() => setCart([])}
        />
      ) : null}
    </section>
  );
}

function CartDrawer({
  cart,
  total,
  onClose,
  onQty,
  onRemove,
  onDone,
}: {
  cart: CartLine[];
  total: number;
  onClose: () => void;
  onQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onDone: () => void;
}) {
  const t = useTranslations("market");
  const [buyer, setBuyer] = useState<"PERSON" | "COMPANY">("PERSON");
  const [delivery, setDelivery] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [orderNo, setOrderNo] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/public/market/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((line) => ({ product_id: line.id, quantity: line.qty })),
          buyer_type: buyer,
          buyer_name: String(form.get("name") ?? ""),
          buyer_phone: String(form.get("phone") ?? "").replace(/[\s-]/g, ""),
          company_name: buyer === "COMPANY" ? String(form.get("company") ?? "") : null,
          company_inn: buyer === "COMPANY" ? String(form.get("inn") ?? "") : null,
          delivery,
          address: delivery === "DELIVERY" ? String(form.get("address") ?? "") : null,
          comment: String(form.get("comment") ?? ""),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { order_no?: string; detail?: string | { msg?: string }[] };
      if (!response.ok) {
        setError(typeof body.detail === "string" ? body.detail : t("failed"));
        return;
      }
      setOrderNo(body.order_no ?? "");
      onDone();
    } catch {
      setError(t("failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={t("cart")}>
      <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={onClose} aria-label={t("close")} />
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-card shadow-sh3">
        <div className="flex items-center justify-between border-b border-line p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy-900">
            <Icon name="cart" className="size-5 text-primary" /> {t("cart")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 place-items-center rounded-xl hover:bg-canvas">
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {orderNo ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-success-100 text-2xl text-success-600" aria-hidden="true">✓</span>
            <p className="mt-4 text-xl font-extrabold text-navy-900">{t("done")}</p>
            <p className="mt-2 text-sm text-muted">{t("doneText", { no: orderNo })}</p>
            <button type="button" onClick={onClose} className="mt-6 min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white">
              {t("close")}
            </button>
          </div>
        ) : cart.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">{t("cartEmpty")}</p>
        ) : (
          <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
            <ul className="divide-y divide-line px-5">
              {cart.map((line) => (
                <li key={line.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">{line.name}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {line.price === null ? t("priceOnRequest") : `${money(line.price)} ${t("perUnit", { unit: line.unit })}`}
                    </p>
                  </div>
                  <label className="sr-only" htmlFor={`qty-${line.id}`}>{t("quantity")}</label>
                  <input
                    id={`qty-${line.id}`}
                    type="number"
                    min={line.min}
                    step="any"
                    value={line.qty}
                    onChange={(e) => onQty(line.id, Number(e.target.value))}
                    className="h-10 w-20 rounded-xl border border-line-strong px-2 text-right text-sm tabular-nums"
                  />
                  <span className="w-12 truncate text-xs text-muted">{line.unit}</span>
                  <button type="button" onClick={() => onRemove(line.id)} aria-label={t("remove")} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-100 hover:text-danger-600">
                    <Icon name="close" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mx-5 mt-2 rounded-xl bg-canvas p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-muted">{t("total")}</span>
                <span className="text-xl font-extrabold tabular-nums text-navy-900">{money(total)} so&apos;m</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">{t("totalNote")}</p>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-navy-900">{t("buyer")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["PERSON", "COMPANY"] as const).map((kind) => (
                    <button key={kind} type="button" aria-pressed={buyer === kind} onClick={() => setBuyer(kind)} className={`min-h-11 rounded-xl border text-sm font-semibold ${buyer === kind ? "border-primary bg-blue-50 text-primary" : "border-line-strong text-navy-900"}`}>
                      {kind === "PERSON" ? t("person") : t("company")}
                    </button>
                  ))}
                </div>
              </fieldset>
              {buyer === "COMPANY" ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
                    {t("companyName")}
                    <input name="company" required minLength={2} maxLength={200} className={FIELD} />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
                    {t("inn")}
                    <input name="inn" required pattern="\d{9}" inputMode="numeric" maxLength={9} className={FIELD} />
                  </label>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
                  {buyer === "COMPANY" ? t("contactName") : t("name")}
                  <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={FIELD} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
                  {t("phone")}
                  <input name="phone" required defaultValue="+998" pattern="\+998[\d\s-]{9,12}" inputMode="tel" autoComplete="tel" className={FIELD} />
                </label>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-navy-900">{t("delivery")}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["PICKUP", "DELIVERY"] as const).map((kind) => (
                    <button key={kind} type="button" aria-pressed={delivery === kind} onClick={() => setDelivery(kind)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${delivery === kind ? "border-primary bg-blue-50 text-primary" : "border-line-strong text-navy-900"}`}>
                      <Icon name={kind === "PICKUP" ? "factory" : "truck"} className="size-4" />
                      {kind === "PICKUP" ? t("pickup") : t("deliver")}
                    </button>
                  ))}
                </div>
              </fieldset>
              {delivery === "DELIVERY" ? (
                <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
                  {t("address")}
                  <input name="address" required minLength={3} maxLength={300} autoComplete="street-address" className={FIELD} />
                </label>
              ) : null}
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
                {t("comment")}
                <textarea name="comment" rows={2} maxLength={1000} className={`${FIELD} py-2.5`} />
              </label>
              {error ? <p role="alert" className="text-sm font-semibold text-danger-600">{error}</p> : null}
              <button type="submit" disabled={sending} className="min-h-12 rounded-xl bg-primary text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50">
                {sending ? t("sending") : t("submit")}
              </button>
              <p className="text-center text-[11px] text-muted">{t("privacy")}</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
