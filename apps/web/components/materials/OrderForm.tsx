"use client";

import { useState } from "react";

const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";

export function OrderForm({ productId, name }: { productId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(formData: FormData) {
    const response = await fetch("/api/v1/public/order-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        buyer_name: String(formData.get("buyer_name") ?? ""),
        buyer_phone: String(formData.get("buyer_phone") ?? ""),
        quantity: Number(formData.get("quantity") ?? 1),
        comment: name,
      }),
    });
    setOk(response.ok);
    setNote(response.ok ? "Buyurtma qabul qilindi" : "Buyurtma yuborilmadi");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover"
      >
        Buyurtma
      </button>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-2 border-t border-line pt-4">
      <input name="buyer_name" required placeholder="Ism" aria-label="Ism" className={FIELD} />
      <div className="grid grid-cols-[1fr_88px] gap-2">
        <input name="buyer_phone" required placeholder="+998901112233" aria-label="Telefon" className={FIELD} />
        <input name="quantity" required type="number" min={1} defaultValue={1} aria-label="Soni" className={FIELD} />
      </div>
      <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover">
        Buyurtma
      </button>
      {note ? <p className={`text-sm font-semibold ${ok ? "text-success-600" : "text-danger-600"}`}>{note}</p> : null}
    </form>
  );
}
