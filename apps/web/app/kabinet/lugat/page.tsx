"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useCallback, useEffect, useState } from "react";

type Word = { id: string; word: string; translation: string; category: string };
type Today = { new: Word[]; learned: number; total: number };

export default function VocabPage() {
  const [data, setData] = useState<Today | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "guest" | "error">("loading");
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/vocab/today", { credentials: "include" });
      if (response.status === 401) {
        setState("guest");
        return;
      }
      if (!response.ok) {
        throw new Error("load");
      }
      setData((await response.json()) as Today);
      setIndex(0);
      setShown(false);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function answer(correct: boolean, word: Word) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/v1/vocab/answers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word_id: word.id, correct }),
      });
      if (!response.ok) {
        throw new Error("save");
      }
      setShown(false);
      if (data && index + 1 >= data.new.length) {
        await load();
      } else {
        setIndex(index + 1);
      }
    } catch {
      setError("Javob saqlanmadi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return <div className="max-w-2xl animate-pulse rounded-3xl bg-white p-10 text-center text-muted">Yuklanmoqda…</div>;
  }
  if (state === "guest") {
    return <EmptyState title="Kirish kerak" text="Lug'atni ko'rish uchun tizimga kiring." />;
  }
  if (state === "error" || !data) {
    return <EmptyState title="Lug'at yuklanmadi" text="Birozdan keyin qayta urinib ko'ring." />;
  }

  const percent = data.total > 0 ? Math.round((data.learned / data.total) * 100) : 0;
  const word = data.new[index];

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Lug&apos;at (nemis tili)</h1>

      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between text-sm font-semibold text-navy-900">
          <span>O&apos;zlashtirilgan (5 qutidan 3-qutiga yetgan)</span>
          <span className="tabular-nums">{data.learned} / {data.total}</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-success-600" style={{ width: `${percent}%` }} />
        </div>
      </section>

      {data.total === 0 ? (
        <EmptyState title="Lug'at hali tayyor emas" text="So'zlar muallif va muharrir tasdiqlagandan keyin chiqadi." />
      ) : !word ? (
        <EmptyState title="Bugungi so'zlar tugadi" text="Keyingi takrorlash vaqti kelganda yangi so'zlar chiqadi." />
      ) : (
        <section className="rounded-2xl border border-line bg-card p-6 text-center shadow-sm sm:p-10">
          <p className="text-xs font-bold tracking-wider text-primary uppercase">
            {word.category} · {index + 1} / {data.new.length}
          </p>
          <p className="mt-4 text-4xl font-black text-navy-900">{word.word}</p>
          {shown ? (
            <>
              <p className="mt-4 text-3xl font-extrabold text-navy-900 text-success-600">{word.translation}</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <button type="button" disabled={saving} onClick={() => void answer(false, word)} className="rounded-2xl border border-line-strong py-3.5 text-sm font-bold text-danger-600 hover:bg-danger-100 disabled:opacity-50">
                  Bilmadim
                </button>
                <button type="button" disabled={saving} onClick={() => void answer(true, word)} className="rounded-2xl bg-success-600 py-3.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                  Bildim
                </button>
              </div>
            </>
          ) : (
            <button type="button" onClick={() => setShown(true)} className="mt-8 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover">
              Tarjimani ko&apos;rsatish
            </button>
          )}
          {error ? <p className="mt-3 text-sm text-danger-600">{error}</p> : null}
        </section>
      )}
    </div>
  );
}
