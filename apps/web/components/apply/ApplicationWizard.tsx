"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

type Trade = { code: string; name: string };

const TYPES = ["YOUTH", "WORKER_UPSKILL", "UNIVERSITY_GRAD"] as const;
const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";
const LABEL = "flex flex-col gap-1.5 text-sm font-semibold text-navy-900";
const CHOICE = "flex min-h-11 items-center gap-2.5 rounded-xl border border-line px-3 text-sm text-navy-900 has-[:checked]:border-primary has-[:checked]:bg-blue-50";

export function ApplicationWizard() {
  const t = useTranslations("wizard");
  const [step, setStep] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [type, setType] = useState<(typeof TYPES)[number]>("YOUTH");
  const [trade, setTrade] = useState("plumber");
  const [track, setTrack] = useState("DOMESTIC");
  const [experience, setExperience] = useState("0");
  const [hasLanguage, setHasLanguage] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("2005-01-01");
  const [personal, setPersonal] = useState(false);
  const [telegram, setTelegram] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [matrix, setMatrix] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/public/home")
      .then((response) => response.json())
      .then((body: { trades?: Trade[] }) => {
        if (body.trades && body.trades.length > 0) {
          setTrades(body.trades);
          setTrade(body.trades[0].code);
        }
      })
      .catch(() => setTrades([]));
  }, []);

  async function submit() {
    setError("");
    setSending(true);
    try {
      const response = await fetch("/api/v1/applications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          trade_code: trade,
          track,
          experience_years: Number(experience),
          has_language: hasLanguage,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          consent_personal: personal,
          consent_telegram: telegram,
        }),
      });
      const body = (await response.json()) as { detail?: string; matrix?: string };
      if (!response.ok) {
        setError(body.detail ?? t("failed"));
        return;
      }
      setMatrix(body.matrix ?? "—");
    } catch {
      setError(t("failed"));
    } finally {
      setSending(false);
    }
  }

  if (matrix !== null) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 shadow-sh2 sm:p-8">
        <span className="grid size-12 place-items-center rounded-full bg-success-100 text-2xl text-success-600" aria-hidden="true">
          ✓
        </span>
        <h2 className="mt-4 text-2xl font-extrabold text-navy-900">{t("doneTitle")}</h2>
        <p className="mt-2 font-semibold text-navy-900">{t("doneMatrix", { matrix })}</p>
        <p className="mt-1 text-sm text-muted">{t("doneText")}</p>
        <Link href="/kabinet/arizam" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover">
          {t("track")} →
        </Link>
      </div>
    );
  }

  const stages = [t("step1"), t("step2"), t("step3")];
  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-sh2">
      <ol className="mb-6 flex items-center justify-between gap-2 rounded-full border border-line px-3 py-2" aria-label={t("steps")}>
        {stages.map((label, index) => (
          <li key={label} aria-current={index === step ? "step" : undefined} className={`flex items-center gap-2 text-xs font-semibold sm:text-sm ${index === step ? "text-navy-900" : "text-muted"}`}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs text-white ${index <= step ? "bg-primary" : "bg-line-strong"}`}>
              {index < step ? "✓" : index + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>
      {step === 0 ? (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold text-navy-900">{t("who")}</legend>
            {TYPES.map((item) => (
              <label key={item} className={CHOICE}>
                <input type="radio" name="type" className="accent-primary" checked={type === item} onChange={() => setType(item)} />
                {t(`type.${item}`)}
              </label>
            ))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL}>
              {t("lastName")}
              <input className={FIELD} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </label>
            <label className={LABEL}>
              {t("firstName")}
              <input className={FIELD} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </label>
          </div>
          <label className={LABEL}>
            {t("birthDate")}
            <input type="date" className={FIELD} autoComplete="bday" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
          </label>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <label className={LABEL}>
            {t("trade")}
            <select className={FIELD} value={trade} onChange={(event) => setTrade(event.target.value)}>
              {trades.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <label className={CHOICE}>
              <input type="radio" name="track" className="accent-primary" checked={track === "DOMESTIC"} onChange={() => setTrack("DOMESTIC")} />
              {t("trackDomestic")}
            </label>
            <label className={CHOICE}>
              <input type="radio" name="track" className="accent-primary" checked={track === "FOREIGN"} onChange={() => setTrack("FOREIGN")} />
              {t("trackForeign")}
            </label>
          </div>
          <label className={LABEL}>
            {t("experience")}
            <input type="number" min={0} max={50} className={FIELD} value={experience} onChange={(event) => setExperience(event.target.value)} />
          </label>
          <label className={CHOICE}>
            <input type="checkbox" className="accent-primary" checked={hasLanguage} onChange={(event) => setHasLanguage(event.target.checked)} />
            {t("language")}
          </label>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="flex flex-col gap-2">
          <label className={CHOICE}>
            <input type="checkbox" className="accent-primary" checked={personal} onChange={(event) => setPersonal(event.target.checked)} />
            {t("consentPersonal")}
          </label>
          <label className={CHOICE}>
            <input type="checkbox" className="accent-primary" checked={telegram} onChange={(event) => setTelegram(event.target.checked)} />
            {t("consentTelegram")}
          </label>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger-600">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
            {t("back")}
          </Button>
        ) : null}
        {step < 2 ? (
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-hover disabled:opacity-50"
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && (firstName.trim().length < 2 || lastName.trim().length < 2)}
          >
            {t("next")}
          </button>
        ) : (
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-hover disabled:opacity-50"
            onClick={() => void submit()}
            disabled={!personal || !telegram || sending}
          >
            {sending ? t("sending") : t("submit")}
          </button>
        )}
      </div>
    </div>
  );
}
