"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Word = { id: string; word: string; translation: string; category: string };
type Today = { new: Word[]; learned: number; total: number };
type Day = { day: string; answers: number; correct: number };
type Streak = { current: number; best: number; goal: number; today: number; goal_met: boolean; week: Day[] };
type Row = { rank: number; name: string; score: number; learned: number; me: boolean };

/** Speak a German word with the browser's own speech engine (no network, no cost). */
function speak(word: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "de-DE";
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export default function VocabPage() {
  const t = useTranslations("vocabPage");
  const weekdays = t("weekdays").split(",");
  const [data, setData] = useState<Today | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [board, setBoard] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "guest" | "error">("loading");
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [canSpeak, setCanSpeak] = useState(false);

  const loadSide = useCallback(async () => {
    const [s, b] = await Promise.all([
      fetch("/api/v1/vocab/streak", { credentials: "include" }),
      fetch("/api/v1/vocab/leaderboard", { credentials: "include" }),
    ]);
    if (s.ok) {
      setStreak((await s.json()) as Streak);
    }
    if (b.ok) {
      setBoard((await b.json()) as Row[]);
    }
  }, []);

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
      void loadSide();
    } catch {
      setState("error");
    }
  }, [loadSide]);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
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
        void loadSide();
      }
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return <div className="max-w-2xl animate-pulse rounded-2xl bg-card p-10 text-center text-muted">{t("loading")}</div>;
  }
  if (state === "guest") {
    return <EmptyState title={t("guestTitle")} text={t("guestText")} />;
  }
  if (state === "error" || !data) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }

  const percent = data.total > 0 ? Math.round((data.learned / data.total) * 100) : 0;
  const word = data.new[index];
  const goalPct = streak ? Math.min(100, Math.round((streak.today / streak.goal) * 100)) : 0;
  const maxDay = Math.max(1, ...(streak?.week.map((day) => day.answers) ?? [1]));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
            <div className="flex items-center justify-between text-sm font-semibold text-navy-900">
              <span>{t("learned")}</span>
              <span className="tabular-nums">
                {data.learned} / {data.total}
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-success-600" style={{ width: `${percent}%` }} />
            </div>
          </section>

          {data.total === 0 ? (
            <EmptyState title={t("notReadyTitle")} text={t("notReadyText")} />
          ) : !word ? (
            <EmptyState title={t("doneTitle")} text={t("doneText")} />
          ) : (
            <section className="rounded-2xl border border-line bg-card p-6 text-center shadow-sh1 sm:p-10">
              <p className="text-xs font-bold tracking-wider text-primary uppercase">
                {word.category} · {index + 1} / {data.new.length}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <p className="text-4xl font-black text-navy-900" lang="de">
                  {word.word}
                </p>
                {canSpeak ? (
                  <button
                    type="button"
                    onClick={() => speak(word.word)}
                    aria-label={t("listen")}
                    title={t("listen")}
                    className="grid size-10 place-items-center rounded-full bg-blue-100 text-lg text-primary transition hover:bg-primary hover:text-white"
                  >
                    🔊
                  </button>
                ) : null}
              </div>
              {shown ? (
                <>
                  <p className="mt-4 text-3xl font-extrabold text-success-600">{word.translation}</p>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <button type="button" disabled={saving} onClick={() => void answer(false, word)} className="rounded-2xl border border-line-strong py-3.5 text-sm font-bold text-danger-600 hover:bg-danger-100 disabled:opacity-50">
                      {t("unknown")}
                    </button>
                    <button type="button" disabled={saving} onClick={() => void answer(true, word)} className="rounded-2xl bg-success-600 py-3.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                      {t("known")}
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => setShown(true)} className="mt-8 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white hover:bg-primary-hover">
                  {t("show")}
                </button>
              )}
              {error ? <p className="mt-3 text-sm text-danger-600">{error}</p> : null}
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          {streak ? (
            <section className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
              <div className="flex items-center gap-4">
                <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-3xl ${streak.current > 0 ? "bg-amber-100" : "bg-surface-100 grayscale"}`} aria-hidden="true">
                  🔥
                </span>
                <div>
                  <p className="text-xs font-bold tracking-wider text-muted uppercase">{t("streak")}</p>
                  <p className="text-2xl font-extrabold text-navy-900">{t("days", { count: streak.current })}</p>
                  <p className="text-xs text-muted">{t("best", { count: streak.best })}</p>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-navy-900">{t("goal")}</span>
                  <span className="tabular-nums text-muted">
                    {streak.today} / {streak.goal}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-100" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${streak.goal_met ? "bg-success-600" : "bg-accent"}`} style={{ width: `${goalPct}%` }} />
                </div>
                <p className={`mt-2 text-xs font-semibold ${streak.goal_met ? "text-success-600" : "text-muted"}`}>
                  {streak.goal_met ? t("goalMet") : t("goalLeft", { count: streak.goal - streak.today })}
                </p>
              </div>
              <div className="mt-5">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">{t("week")}</p>
                <div className="mt-2 flex items-end gap-2" role="img" aria-label={streak.week.map((day) => `${day.day}: ${day.answers}`).join(", ")}>
                  {streak.week.map((day) => (
                    <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-20 w-full items-end">
                        <div
                          className={`w-full rounded-t-md ${day.answers >= streak.goal ? "bg-success-600" : day.answers > 0 ? "bg-primary" : "bg-surface-100"}`}
                          style={{ height: `${Math.max(6, (day.answers / maxDay) * 100)}%` }}
                          title={`${day.answers}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-muted">{weekdays[new Date(`${day.day}T12:00:00`).getDay()]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
            <h2 className="text-base font-bold text-navy-900">{t("board")}</h2>
            {board.length <= 1 ? (
              <p className="mt-2 text-sm text-muted">{t("boardEmpty")}</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-1.5">
                {board.slice(0, 10).map((row) => (
                  <li key={`${row.rank}-${row.name}`} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${row.me ? "bg-blue-100 font-bold text-navy-900" : "text-body"}`}>
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${row.rank <= 3 ? "bg-accent text-navy-900" : "bg-surface-100 text-muted"}`}>
                      {row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {row.name}
                      {row.me ? ` (${t("you")})` : ""}
                    </span>
                    <span className="text-xs tabular-nums text-muted">{t("points", { count: row.score })}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
