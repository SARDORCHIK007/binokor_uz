"use client";

import { Button } from "@uychibinokor/ui";

export function OrderStatusButton({ id }: { id: string }) {
  async function mark() {
    const response = await fetch(`/api/v1/admin/orders/${id}/status`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    if (response.ok) {
      window.location.reload();
    }
  }
  return (
    <Button type="button" variant="secondary" onClick={() => void mark()}>
      Bog'lanildi
    </Button>
  );
}
