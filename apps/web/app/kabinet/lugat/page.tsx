"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useEffect, useState } from "react";

type Card = { id: string; word: string; translation: string; category: string };
type Today = { new: Card[]; learned: number; total: number };

export default function VocabPage() {
  const [data, setData] = useState<Today | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/vocab/today", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("load");
        }
        return (await response.json()) as Today;
      })
      .then((payload) => {
        if (active) {
          setData(payload);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function answer(correct: boolean) {
    if (!data) {
      return;
    }
    const card = data.new[index];
    if (!card) {
      return;
    }
    await fetch("/api/v1/vocab/answers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word_id: card.id, correct }),
    });
    setShow(false);
    setIndex((value) => value + 1);
  }

  if (failed) {
    return <EmptyState title="Lug'at ochilmadi" text="Sahifani yangilang." />;
  }
  if (!data) {
    return <p className="p-4 text-sm text-muted">Yuklanmoqda</p>;
  }
  const card = data.new[index];
  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Nemis tili</h1>
      <p className="mt-1 text-sm text-muted">
        O'rganilgan {data.learned} / {data.total}
      </p>
      {card ? (
        <article className="mt-4 rounded-md border border-line bg-card p-5">
          <p className="text-sm text-muted">{card.category}</p>
          <p className="mt-2 text-3xl font-semibold">{card.word}</p>
          {show ? <p className="mt-3 text-lg">{card.translation}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setShow(true)}>
              Tarjima
            </Button>
            <Button type="button" onClick={() => void answer(true)}>
              Bildim
            </Button>
            <Button type="button" variant="danger" onClick={() => void answer(false)}>
              Bilmadim
            </Button>
          </div>
        </article>
      ) : (
        <EmptyState title="Bugungi so'zlar tugadi" text="Ertaga yangi 20 tasi ochiladi." />
      )}
    </div>
  );
}
