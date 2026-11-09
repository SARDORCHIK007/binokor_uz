"use client";

import { useState } from "react";
import { Icon } from "@/components/brand/Icon";

export type Product = {
  id: string;
  name: string;
  unit: string;
  price: string | null;
  in_stock: boolean;
  producer: string;
  stale: boolean;
};

const FIELD =
  "min-h-10 w-full rounded-xl border border-line-strong bg-card px-3 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";

function formatPrice(price: string | null): string {
  if (price === null) {
    return "—";
  }
  return Math.round(Number(price))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Compact product row: icon, name, producer, stock dot, price and a small order toggle. */
export function ProductTile({ item }: { item: Product }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(formData: FormData) {
    const response = await fetch("/api/v1/public/order-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: item.id,
        buyer_name: String(formData.get("buyer_name") ?? ""),
        buyer_phone: String(formData.get("buyer_phone") ?? ""),
        quantity: Number(formData.get("quantity") ?? 1),
        comment: item.name,
      }),
    });
    setOk(response.ok);
    setNote(response.ok ? "Buyurtma qabul qilindi" : "Buyurtma yuborilmadi");
  }

  return (
    <div
      className={`rounded-2xl border bg-card p-3 pr-4 shadow-sh1 transition ${
        open ? "border-primary/50 shadow-sh2" : "border-line hover:border-primary/40 hover:shadow-sh2"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-primary ring-1 ring-blue-100">
          <Icon name="box" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-navy-900">{item.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            <span
              className={`size-2 shrink-0 rounded-full ${item.in_stock ? "bg-success-600" : "bg-faint"}`}
              aria-hidden="true"
            />
            {item.in_stock ? "Omborda bor" : "Omborda yo'q"}
            <span aria-hidden="true">·</span>
            <span className="truncate">{item.producer}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg leading-tight font-extrabold tabular-nums text-navy-900">{formatPrice(item.price)}</p>
          <p className="text-[11px] font-semibold text-muted">so&apos;m / {item.unit}</p>
        </div>
        {item.in_stock ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={`Buyurtma: ${item.name}`}
            className={`grid size-10 shrink-0 place-items-center rounded-xl transition ${
              open ? "bg-primary text-white" : "bg-blue-100 text-primary hover:bg-primary hover:text-white"
            }`}
          >
            <Icon name="cart" className="size-5" />
          </button>
        ) : null}
      </div>
      {item.stale ? (
        <p className="mt-2 ml-[60px] inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-[11px] font-semibold text-warning-600">
          Narx eskirgan bo&apos;lishi mumkin
        </p>
      ) : null}
      {open ? (
        <form action={submit} className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_72px_auto]">
          <input name="buyer_name" required placeholder="Ism" aria-label="Ism" className={FIELD} />
          <input name="buyer_phone" required placeholder="+998901112233" aria-label="Telefon" className={FIELD} />
          <input name="quantity" required type="number" min={1} defaultValue={1} aria-label="Soni" className={FIELD} />
          <button type="submit" className="min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover">
            Buyurtma
          </button>
          {note ? (
            <p className={`text-sm font-semibold sm:col-span-4 ${ok ? "text-success-600" : "text-danger-600"}`}>{note}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
