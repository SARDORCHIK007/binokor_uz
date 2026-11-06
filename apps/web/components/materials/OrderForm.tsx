"use client";

import { Button } from "@uychibinokor/ui";
import { useState } from "react";

export function OrderForm({ productId, name }: { productId: string; name: string }) {
  const [note, setNote] = useState("");

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
    setNote(response.ok ? "Buyurtma qabul qilindi" : "Buyurtma yuborilmadi");
  }

  return (
    <form action={submit} className="mt-3 flex flex-col gap-2">
      <input name="buyer_name" required placeholder="Ism" className="min-h-11 rounded-sm border border-line px-3" />
      <input
        name="buyer_phone"
        required
        placeholder="+998901112233"
        className="min-h-11 rounded-sm border border-line px-3"
      />
      <input
        name="quantity"
        required
        type="number"
        min={1}
        defaultValue={1}
        className="min-h-11 rounded-sm border border-line px-3"
      />
      <Button type="submit">Buyurtma</Button>
      {note ? <p className="text-sm">{note}</p> : null}
    </form>
  );
}
