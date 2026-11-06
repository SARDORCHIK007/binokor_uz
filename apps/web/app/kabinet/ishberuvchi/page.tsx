"use client";

import { Button, EmptyState, TextField } from "@uychibinokor/ui";
import { useEffect, useState } from "react";

type Employer = { id: string; name: string; inn: string | null; verified: boolean };
type Demand = { id: string; quantity: number; status: string; track: string };
type Worker = { user_id: string; name: string; trade: string; level: string };

export default function EmployerPage() {
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [requests, setRequests] = useState<Demand[]>([]);
  const [placements, setPlacements] = useState<{ id: string; name: string }[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [name, setName] = useState("");
  const [inn, setInn] = useState("");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<Employer[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const response = await fetch("/api/v1/employers/me", { credentials: "include" });
    if (!response.ok) {
      setFailed(true);
      setLoading(false);
      return;
    }
    const body = (await response.json()) as {
      employer: Employer | null;
      requests: Demand[];
      placements?: { id: string; name: string }[];
    };
    setEmployer(body.employer);
    setRequests(body.requests);
    setPlacements(body.placements ?? []);
    setLoading(false);
    const admin = await fetch("/api/v1/admin/employers", { credentials: "include" });
    if (admin.ok) {
      const rows = (await admin.json()) as Employer[];
      setPending(rows.filter((item) => !item.verified));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function register() {
    const response = await fetch("/api/v1/employers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, inn }),
    });
    setNote(response.ok ? "Ro'yxatdan o'tdi. Admin tasdig'i kutilmoqda." : "Saqlanmadi");
    await load();
  }

  async function search() {
    const response = await fetch(`/api/v1/employers/workers?q=${encodeURIComponent(query)}`, {
      credentials: "include",
    });
    if (!response.ok) {
      setNote("Qidiruv ochilmadi");
      return;
    }
    const body = (await response.json()) as Worker[];
    if (JSON.stringify(body).includes("+998")) {
      setNote("Telefon chiqib qoldi");
      return;
    }
    setWorkers(body);
  }

  async function sendRequest() {
    const response = await fetch("/api/v1/employers/requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trade_code: "plumber", quantity: 1, track: "DOMESTIC" }),
    });
    setNote(response.ok ? "So'rov yuborildi" : "So'rov yuborilmadi. Tasdiq kerak bo'lishi mumkin.");
    await load();
  }

  async function shortlist(workerId: string) {
    const requestId = requests[0]?.id;
    if (!requestId) {
      setNote("Avval so'rov yuboring");
      return;
    }
    const response = await fetch(`/api/v1/employers/requests/${requestId}/candidates`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_user_id: workerId }),
    });
    setNote(response.ok ? "Nomzod qo'shildi" : "Nomzod qo'shilmadi");
  }

  if (loading) {
    return <p className="p-4 text-sm text-muted">Yuklanmoqda</p>;
  }
  if (failed) {
    return <EmptyState title="Kabinet ochilmadi" text="Qaytadan kiring." />;
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold text-navy-900">Ish beruvchi</h1>
      {employer ? (
        <section className="rounded-md border border-line bg-card p-4">
          <p className="font-semibold">{employer.name}</p>
          <p className="text-sm text-muted">STIR {employer.inn}</p>
          <p className="text-sm">{employer.verified ? "Tasdiqlangan" : "Admin tasdig'i kutilmoqda"}</p>
          <Button type="button" className="mt-3" onClick={() => void sendRequest()}>
            Santexnik so'rash
          </Button>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-md border border-line bg-card p-4">
          <TextField label="Kompaniya nomi" name="name" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField label="STIR" name="inn" value={inn} onChange={(event) => setInn(event.target.value)} />
          <Button type="button" onClick={() => void register()}>
            Ro'yxatdan o'tish
          </Button>
        </section>
      )}
      <section className="rounded-md border border-line bg-card p-4">
        <h2 className="font-semibold">So'rovlar</h2>
        {requests.length === 0 ? <p className="mt-2 text-sm text-muted">So'rov yo'q</p> : null}
        <ul className="mt-2 flex flex-col gap-2">
          {requests.map((item) => (
            <li key={item.id}>
              {item.track} · {item.quantity} · {item.status}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border border-line bg-card p-4">
        <h2 className="font-semibold">Ustalarni qidirish</h2>
        <div className="mt-2 flex gap-2">
          <TextField label="Ism" name="q" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button type="button" onClick={() => void search()}>
            Qidirish
          </Button>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {workers.map((worker) => (
            <li key={worker.user_id} className="flex items-center justify-between gap-2">
              <span>
                {worker.name} · {worker.trade} · {worker.level}
              </span>
              <Button type="button" onClick={() => void shortlist(worker.user_id)}>
                Ro'yxatga
              </Button>
            </li>
          ))}
        </ul>
      </section>
      {placements.length > 0 ? (
        <section className="rounded-md border border-line bg-card p-4">
          <h2 className="font-semibold">Joylashtirish bahosi</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {placements.map((item) => (
              <li key={item.id}>
                <Button
                  type="button"
                  onClick={() =>
                    void fetch(`/api/v1/employers/placements/${item.id}/review`, {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ quality: 5, discipline: 4, safety: 5, communication: 4, comment: "Yaxshi ish" }),
                    }).then((response) => setNote(response.ok ? "Baho saqlandi" : "Baho saqlanmadi"))
                  }
                >
                  {item.name} · 5/4/5/4
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {pending.length > 0 ? (
        <section className="rounded-md border border-line bg-card p-4">
          <h2 className="font-semibold">Tasdiq kutayotgan kompaniyalar</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {pending.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span>
                  {item.name} · {item.inn}
                </span>
                <Button
                  type="button"
                  onClick={() =>
                    void fetch(`/api/v1/admin/employers/${item.id}/verify`, {
                      method: "POST",
                      credentials: "include",
                    }).then(() => load())
                  }
                >
                  Tasdiqlash
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {note ? <p className="text-sm">{note}</p> : null}
    </div>
  );
}
