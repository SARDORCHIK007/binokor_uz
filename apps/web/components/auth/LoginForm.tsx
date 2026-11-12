"use client";

import { Button, TextField } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

const DEMOS = [
  { phone: "+998901000001", labelKey: "admin" },
  { phone: "+998901000002", labelKey: "mentor" },
  { phone: "+998901000003", labelKey: "student" },
] as const;

const ONE_CLICK = ["admin", "mentor", "student", "worker", "employer", "producer", "hokimlik"] as const;
const STAFF = ["director", "namdtu", "bandlik", "agency", "republic", "mahalla", "foreign"] as const;
const CHIP =
  "rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-navy-900 ring-1 ring-line transition hover:bg-primary hover:text-white hover:ring-primary";
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ErrorBody = { detail?: string; title?: string };

export function LoginForm({ register = false }: { register?: boolean }) {
  const t = useTranslations("auth");
  const [phone, setPhone] = useState("+998901000001");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp] = useState("");
  const [devTotp, setDevTotp] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function demo(role: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      const body = (await response.json()) as { next?: string } & ErrorBody;
      if (!response.ok) {
        setError(body.detail ?? t("failed"));
        return;
      }
      window.location.assign(body.next ?? "/kabinet");
    } finally {
      setPending(false);
    }
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const body = (await response.json()) as { dev_code?: string; delivery?: string } & ErrorBody;
      if (!response.ok) {
        setError(body.detail ?? t("failed"));
        return;
      }
      if (body.dev_code) {
        setDevCode(body.dev_code);
        setCode(body.dev_code);
      } else {
        setDevCode("");
        setError(body.delivery === "telegram" ? "Kod Telegramga yuborildi" : t("failed"));
      }
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, code }),
      });
      const body = (await response.json()) as { requires_2fa?: boolean; dev_totp?: string } & ErrorBody;
      if (!response.ok) {
        setError(body.detail ?? t("failed"));
        return;
      }
      if (body.requires_2fa) {
        setNeedsTotp(true);
        setDevTotp(body.dev_totp ?? "");
        setTotp(body.dev_totp ?? "");
        return;
      }
      window.location.assign("/kabinet");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{register ? t("registerTitle") : t("title")}</h1>
        <p className="mt-2 leading-relaxed text-muted">{register ? t("registerText") : t("text")}</p>
      </div>
      {demoMode ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h2 className="text-lg font-bold text-navy-900">{t("demoTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("demoText")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ONE_CLICK.map((role) => (
              <button key={role} type="button" className={CHIP} onClick={() => void demo(role)}>
                {t(role)}
              </button>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-bold text-navy-900">{t("staffTitle")}</h3>
          <p className="mt-1 text-xs text-muted">{t("staffNote")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STAFF.map((role) => (
              <button key={role} type="button" className={CHIP} onClick={() => void demo(role)}>
                {t(role)}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <form onSubmit={requestCode} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6">
        <TextField label={t("phone")} name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
        <div className="flex flex-wrap gap-2">
          {DEMOS.map((item) => (
            <button
              key={item.phone}
              type="button"
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${phone === item.phone ? "border-primary bg-blue-100 text-primary" : "border-line bg-canvas text-navy-900 hover:border-primary"}`}
              onClick={() => setPhone(item.phone)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={pending}>
          {t("send")}
        </Button>
        {devCode ? (
          <p className="rounded-xl bg-amber-100 px-3 py-3 text-navy-900" role="status">
            {t("codeShown")}: <strong className="font-mono text-lg">{devCode}</strong>
          </p>
        ) : null}
      </form>
      <form onSubmit={verifyCode} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6">
        <TextField label={t("code")} name="code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" />
        {error ? <p className="text-sm text-danger-600">{error}</p> : null}
        <Button type="submit" disabled={pending || code.length < 6}>
          {t("enter")}
        </Button>
      </form>
      {needsTotp ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            try {
              const response = await fetch("/api/v1/auth/totp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ phone, code: totp }),
              });
              const body = (await response.json()) as ErrorBody;
              if (!response.ok) {
                setError(body.detail ?? t("failed"));
                return;
              }
              window.location.assign("/kabinet");
            } finally {
              setPending(false);
            }
          }}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6"
        >
          <TextField label={t("totp")} name="totp" inputMode="numeric" value={totp} onChange={(event) => setTotp(event.target.value)} />
          {devTotp ? (
            <p className="rounded-xl bg-amber-100 px-3 py-3 text-navy-900" role="status">
              {t("totpShown")}: <strong className="font-mono text-lg">{devTotp}</strong>
            </p>
          ) : null}
          {error ? <p className="text-sm text-danger-600">{error}</p> : null}
          <Button type="submit" disabled={pending || totp.length < 6}>
            {t("enter")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
