"use client";

import { Button, EmptyState, TextField } from "@uychibinokor/ui";
import { useEffect, useState } from "react";

type Product = { id: string; name: string; unit: string; price: string | null; in_stock: boolean };
type Order = { id: string; buyer_name: string; quantity: number; status: string; product: string };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("10000");
  const [company, setCompany] = useState("");
  const [inn, setInn] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const response = await fetch("/api/v1/producers/products", { credentials: "include" });
    if (response.status === 401) {
      setFailed(true);
      return;
    }
    setProducts((await response.json()) as Product[]);
    const incoming = await fetch("/api/v1/producers/orders", { credentials: "include" });
    if (incoming.ok) {
      setOrders((await incoming.json()) as Order[]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function register() {
    const response = await fetch("/api/v1/producers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: company, inn }),
    });
    setNote(response.ok ? "Ishlab chiqaruvchi ochildi" : "Saqlanmadi");
    await load();
  }

  async function create() {
    const response = await fetch("/api/v1/producers/products", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, unit: "dona", price: Number(price), in_stock: true }),
    });
    setNote(response.ok ? "Mahsulot qo'shildi" : "Mahsulot qo'shilmadi");
    await load();
  }

  async function mark(orderId: string) {
    await fetch(`/api/v1/producers/orders/${orderId}/status`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    await load();
  }

  if (failed) {
    return <EmptyState title="Kabinet ochilmadi" text="Qaytadan kiring." />;
  }
  if (!products) {
    return <p className="p-4 text-sm text-muted">Yuklanmoqda</p>;
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Mahsulotlarim</h1>
      {products.length === 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card shadow-sh1 p-4">
          <TextField label="Korxona" name="company" value={company} onChange={(event) => setCompany(event.target.value)} />
          <TextField label="STIR" name="inn" value={inn} onChange={(event) => setInn(event.target.value)} />
          <Button type="button" onClick={() => void register()}>
            Ishlab chiqaruvchi sifatida ochish
          </Button>
        </section>
      ) : null}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card shadow-sh1 p-4">
        <TextField label="Mahsulot" name="name" value={name} onChange={(event) => setName(event.target.value)} />
        <TextField label="Narx" name="price" value={price} onChange={(event) => setPrice(event.target.value)} />
        <Button type="button" onClick={() => void create()}>
          Qo'shish
        </Button>
        {products.length === 0 ? <p className="text-sm text-muted">Mahsulot yo'q</p> : null}
        <ul className="flex flex-col gap-2">
          {products.map((item) => (
            <li key={item.id}>
              {item.name} · {item.price} so'm · {item.in_stock ? "omborda" : "yo'q"}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-line bg-card shadow-sh1 p-4">
        <h2 className="font-semibold">Kelgan buyurtmalar</h2>
        {orders.length === 0 ? <p className="mt-2 text-sm text-muted">Buyurtma yo'q</p> : null}
        <ul className="mt-3 flex flex-col gap-2.5">
          {orders.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-2">
              <span>
                {order.product} · {order.buyer_name} · {order.quantity} · {order.status}
              </span>
              <Button type="button" onClick={() => void mark(order.id)}>
                Bog'landi
              </Button>
            </li>
          ))}
        </ul>
      </section>
      {note ? <p className="text-sm">{note}</p> : null}
    </div>
  );
}
