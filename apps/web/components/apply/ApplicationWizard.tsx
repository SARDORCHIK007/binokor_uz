"use client";

import { Button } from "@uychibinokor/ui";
import { useEffect, useState } from "react";

type Trade = { code: string; name: string };

const TYPES = [
  { id: "YOUTH", label: "Yosh" },
  { id: "WORKER_UPSKILL", label: "Usta, malaka oshirish" },
  { id: "UNIVERSITY_GRAD", label: "OTM bitiruvchisi" },
] as const;

export function ApplicationWizard() {
  const [step, setStep] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [type, setType] = useState("YOUTH");
  const [trade, setTrade] = useState("plumber");
  const [track, setTrack] = useState("DOMESTIC");
  const [experience, setExperience] = useState("0");
  const [hasLanguage, setHasLanguage] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("2000-01-01");
  const [personal, setPersonal] = useState(false);
  const [telegram, setTelegram] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    void fetch("/api/v1/public/home")
      .then((response) => response.json())
      .then((body: { trades?: Trade[] }) => {
        if (body.trades && body.trades.length > 0) {
          setTrades(body.trades);
          setTrade(body.trades[0].code);
        }
      });
  }, []);

  async function submit() {
    setError("");
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
    const body = (await response.json()) as { detail?: string; matrix?: string; status?: string };
    if (!response.ok) {
      setError(body.detail ?? "Ariza yuborilmadi");
      return;
    }
    setResult(`${body.status} · tavsiya ${body.matrix}`);
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-line bg-card shadow-sh1 p-5">
        <h1 className="text-3xl font-extrabold text-navy-900">Ariza qabul qilindi</h1>
        <p className="mt-2">{result}</p>
        <p className="mt-2 text-sm text-muted">Yo'lni tizim taklif qildi. Qarorni xodim tasdiqlaydi.</p>
      </div>
    );
  }

  const stages = ["Shaxsiy ma'lumotlar", "Kasb tanlash", "Tasdiqlash"];
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sh2">
      <ol className="mb-6 flex items-center justify-between gap-2 rounded-full border border-line px-3 py-2" aria-label="Qadamlar">
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
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-navy-900">Shaxsiy ma&apos;lumotlaringiz</p>
          {TYPES.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center gap-2">
              <input type="radio" name="type" checked={type === item.id} onChange={() => setType(item.id)} />
              {item.label}
            </label>
          ))}
          <label className="flex flex-col gap-1">Familiya<input className="min-h-11 rounded-xl border border-line px-3" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label className="flex flex-col gap-1">Ism<input className="min-h-11 rounded-xl border border-line px-3" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label className="flex flex-col gap-1">Tug&apos;ilgan sana<input type="date" className="min-h-11 rounded-xl border border-line px-3" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 font-semibold">
            Kasb
            <select className="min-h-11 rounded-xl border border-line px-3 font-normal" value={trade} onChange={(event) => setTrade(event.target.value)}>
              {trades.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" checked={track === "DOMESTIC"} onChange={() => setTrack("DOMESTIC")} /> Ichki trek</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" checked={track === "FOREIGN"} onChange={() => setTrack("FOREIGN")} /> Tashqi trek</label>
          <label className="flex flex-col gap-1">Tajriba, yil<input className="min-h-11 rounded-xl border border-line px-3" value={experience} onChange={(event) => setExperience(event.target.value)} /></label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={hasLanguage} onChange={(event) => setHasLanguage(event.target.checked)} /> Chet tili bor</label>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-navy-900">Tasdiqlash</p>
          <ul className="text-sm text-muted">
            <li>Tez va qulay</li>
            <li>Bepul o&apos;qish</li>
            <li>Sertifikat va QR pasport</li>
          </ul>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={personal} onChange={(event) => setPersonal(event.target.checked)} /> Shaxsiy ma&apos;lumotlarni qayta ishlashga roziman</label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={telegram} onChange={(event) => setTelegram(event.target.checked)} /> Telegram orqali xabar olishga roziman</label>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger-600">{error}</p> : null}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {step > 0 ? <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>Orqaga</Button> : null}
        {step < 2 ? (
          <button type="button" className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-hover disabled:opacity-50" onClick={() => setStep(step + 1)} disabled={step === 0 && (firstName.length < 2 || lastName.length < 2)}>Keyingi bosqich →</button>
        ) : (
          <button type="button" className="min-h-12 flex-1 rounded-xl bg-primary px-5 font-bold text-white hover:bg-primary-hover disabled:opacity-50" onClick={() => void submit()} disabled={!personal || !telegram}>Yuborish</button>
        )}
      </div>
    </div>
  );
}
