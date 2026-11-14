"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge, CARD, Meter, PageHead, Tile } from "@/components/cabinet/kit";

type Question = { id: string; body: string; options: string[] };
type OpenExam = { state: "open"; questions: Question[]; deadline: string; minutes: number };
type DoneExam = { state: "done"; theory_score: number | null; practice_score: number | null };
type EmptyExam = { state: "empty" };
type Exam = OpenExam | DoneExam | EmptyExam;

function clock(seconds: number | null): string {
  return seconds === null ? "—" : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ExamPage() {
  const t = useTranslations("ex");
  const states = useTranslations("states");
  const [exam, setExam] = useState<Exam | null>(null);
  const [failed, setFailed] = useState(false);
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [score, setScore] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/learning/exam", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return (await response.json()) as Exam;
      })
      .then((payload) => {
        if (active) setExam(payload);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!exam || exam.state !== "open") return;
    const end = new Date(exam.deadline).getTime();
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [exam]);

  async function submit() {
    if (!exam || exam.state !== "open") return;
    const response = await fetch("/api/v1/learning/exam", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: exam.questions.map((question) => ({ question_id: question.id, choice: choices[question.id] ?? 0 })) }),
    });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    const payload = (await response.json()) as { theory_score: number };
    setScore(payload.theory_score);
  }

  if (failed) return <EmptyState title={t("error")} text={t("errorText")} />;
  if (!exam) return <div className="h-48 animate-pulse rounded-2xl bg-card" aria-label={states("loading")} />;
  if (exam.state === "empty") return <EmptyState title={states("noGroupExam")} text={states("noGroupExamText")} />;

  if (exam.state === "done" || score !== null) {
    const theory = score ?? (exam.state === "done" ? exam.theory_score : 0);
    const practice = exam.state === "done" ? exam.practice_score : null;
    return (
      <div className="flex flex-col gap-6">
        <PageHead title={t("title")} text={t("done")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Tile label={t("theory")} value={theory ?? "—"} tone="blue" />
          <Tile label={t("practice")} value={practice ?? "—"} tone={practice === null ? "gray" : "green"} hint={practice === null ? t("practicePending") : undefined} />
        </div>
      </div>
    );
  }

  if (exam.questions.length === 0) return <EmptyState title={states("noQuestions")} text={states("noQuestionsText")} />;

  const total = exam.questions.length;
  const answered = exam.questions.filter((question) => choices[question.id] !== undefined).length;
  const missing = total - answered;
  const urgent = left !== null && left <= 300;

  return (
    <div className="flex flex-col gap-5">
      <PageHead title={t("title")} text={t("meta", { n: total, minutes: exam.minutes })} />
      <div className={`${CARD} sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-48 flex-1">
          <p className="text-sm font-semibold text-navy-900">{t("answered", { done: answered, n: total })}</p>
          <Meter value={Math.round((100 * answered) / total)} tone="blue" label={t("answered", { done: answered, n: total })} />
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-muted">{t("left")}</p>
          <p className={`text-2xl font-extrabold tabular-nums ${urgent ? "text-danger-600" : "text-navy-900"}`}>{clock(left)}</p>
        </div>
      </div>
      {left === 0 ? <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-semibold text-danger-600">{t("timeUp")}</p> : null}

      {exam.questions.map((question, index) => (
        <fieldset key={question.id} className={CARD}>
          <legend className="flex items-start gap-2 px-1 font-bold text-navy-900">
            <Badge tone={choices[question.id] === undefined ? "gray" : "green"}>{index + 1}</Badge>
            <span>{question.body}</span>
          </legend>
          <div className="mt-3 flex flex-col gap-2">
            {question.options.map((option, optionIndex) => (
              <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${choices[question.id] === optionIndex ? "border-primary bg-blue-50 font-semibold text-navy-900" : "border-line hover:border-primary/50"}`}>
                <input type="radio" className="size-4 accent-[var(--primary)]" name={question.id} checked={choices[question.id] === optionIndex} onChange={() => setChoices((current) => ({ ...current, [question.id]: optionIndex }))} />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {confirming && missing > 0 ? (
        <div role="alertdialog" aria-label={t("submit")} className={`${CARD} flex flex-col gap-3`}>
          <p className="text-sm font-semibold text-navy-900">{t("unanswered", { n: missing })}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass()} onClick={() => void submit()}>{t("yes")}</button>
            <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setConfirming(false)}>{t("back")}</button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${buttonClass()} w-fit`} onClick={() => (missing > 0 ? setConfirming(true) : void submit())}>{t("submit")}</button>
      )}
    </div>
  );
}
