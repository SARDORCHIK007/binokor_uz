"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useEffect, useState } from "react";

type Question = { id: string; body: string; options: string[] };
type OpenExam = { state: "open"; questions: Question[]; deadline: string; minutes: number };
type DoneExam = { state: "done"; theory_score: number | null; practice_score: number | null };
type EmptyExam = { state: "empty" };
type Exam = OpenExam | DoneExam | EmptyExam;

export default function ExamPage() {
  const [exam, setExam] = useState<Exam | null>(null);
  const [failed, setFailed] = useState(false);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/learning/exam", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("load");
        }
        return (await response.json()) as Exam;
      })
      .then((payload) => {
        if (active) {
          setExam(payload);
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

  useEffect(() => {
    if (!exam || exam.state !== "open") {
      return;
    }
    const end = new Date(exam.deadline).getTime();
    const timer = window.setInterval(() => {
      setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [exam]);

  async function submit() {
    if (!exam || exam.state !== "open") {
      return;
    }
    const response = await fetch("/api/v1/learning/exam", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: exam.questions.map((question) => ({
          question_id: question.id,
          choice: choices[question.id] ?? 0,
        })),
      }),
    });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    const payload = (await response.json()) as { theory_score: number };
    setScore(payload.theory_score);
  }

  if (failed) {
    return <EmptyState title="Imtihon ochilmadi" text="Sahifani yangilang." />;
  }
  if (!exam) {
    return <p className="p-4 text-sm text-muted">Yuklanmoqda</p>;
  }
  if (exam.state === "empty") {
    return <EmptyState title="Guruh yo'q" text="Imtihon faol tinglovchi uchun ochiladi." />;
  }
  if (exam.state === "done" || score !== null) {
    const theory = score ?? (exam.state === "done" ? exam.theory_score : 0);
    const practice = exam.state === "done" ? exam.practice_score : null;
    return (
      <div className="p-4">
        <h1 className="text-3xl font-extrabold text-[#071833]">Yakuniy sinov</h1>
        <p className="mt-3">Nazariya: {theory}</p>
        <p>Amaliy: {practice ?? "Ustoz bahosi kutilmoqda"}</p>
      </div>
    );
  }
  if (exam.questions.length === 0) {
    return <EmptyState title="Savol yo'q" text="Bu kasb uchun savollar banki bo'sh." />;
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-3xl font-extrabold text-[#071833]">Yakuniy sinov</h1>
      <p className="text-sm text-muted">
        30 savol · qolgan vaqt {left === null ? "—" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}
      </p>
      {exam.questions.map((question, index) => (
        <fieldset key={question.id} className="rounded-[20px] border border-[#e5eaf2] bg-white shadow-sm p-4">
          <legend className="font-semibold">
            {index + 1}. {question.body}
          </legend>
          <div className="mt-3 flex flex-col gap-2.5">
            {question.options.map((option, optionIndex) => (
              <label key={option} className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name={question.id}
                  checked={choices[question.id] === optionIndex}
                  onChange={() => setChoices((current) => ({ ...current, [question.id]: optionIndex }))}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Button type="button" onClick={() => void submit()}>
        Topshirish
      </Button>
    </div>
  );
}
