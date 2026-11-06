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
      <div className="rounded-md border border-line bg-card p-5">
        <h1 className="text-2xl font-semibold text-navy-900">Ariza qabul qilindi</h1>
        <p className="mt-2">{result}</p>
        <p className="mt-2 text-sm text-muted">Yo'lni tizim taklif qildi. Qarorni xodim tasdiqlaydi.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-card p-5">
      <p className="text-sm text-muted">Qadam {step + 1} / 5</p>
      {step === 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">Kim sifatida ariza berasiz?</legend>
          {TYPES.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center gap-2">
              <input type="radio" name="type" checked={type === item.id} onChange={() => setType(item.id)} />
              {item.label}
            </label>
          ))}
        </fieldset>
      ) : null}
      {step === 1 ? (
        <label className="flex flex-col gap-2 font-semibold">
          Kasb
          <select className="min-h-11 rounded-sm border border-line px-3 font-normal" value={trade} onChange={(event) => setTrade(event.target.value)}>
            {trades.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {step === 2 ? (
        <div className="flex flex-col gap-3">
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" checked={track === "DOMESTIC"} onChange={() => setTrack("DOMESTIC")} /> Ichki trek
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="radio" checked={track === "FOREIGN"} onChange={() => setTrack("FOREIGN")} /> Tashqi trek
          </label>
          <label className="flex flex-col gap-1">
            Kasb tajribasi, yil
            <input className="min-h-11 rounded-sm border border-line px-3" value={experience} onChange={(event) => setExperience(event.target.value)} />
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={hasLanguage} onChange={(event) => setHasLanguage(event.target.checked)} />
            Chet tili bor (B1 yoki undan yuqori)
          </label>
        </div>
      ) : null}
      {step === 3 ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">Familiya<input className="min-h-11 rounded-sm border border-line px-3" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label className="flex flex-col gap-1">Ism<input className="min-h-11 rounded-sm border border-line px-3" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label className="flex flex-col gap-1">Tug'ilgan sana<input type="date" className="min-h-11 rounded-sm border border-line px-3" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} /></label>
        </div>
      ) : null}
      {step === 4 ? (
        <div className="flex flex-col gap-3">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={personal} onChange={(event) => setPersonal(event.target.checked)} />
            Shaxsiy ma'lumotlarni qayta ishlashga roziman
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={telegram} onChange={(event) => setTelegram(event.target.checked)} />
            Telegram orqali xabar olishga roziman
          </label>
        </div>
      ) : null}
      {error ? <p className="text-sm text-danger-600">{error}</p> : null}
      <div className="flex gap-2">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
            Orqaga
          </Button>
        ) : null}
        {step < 4 ? (
          <Button type="button" onClick={() => setStep(step + 1)}>
            Davom etish
          </Button>
        ) : (
          <Button type="button" onClick={() => void submit()} disabled={!personal || !telegram || firstName.length < 2 || lastName.length < 2}>
            Yuborish
          </Button>
        )}
      </div>
    </div>
  );
}
