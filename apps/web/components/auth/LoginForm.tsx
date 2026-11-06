"use client";

import { Button, TextField } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

const DEMOS = [
  { phone: "+998901000001", labelKey: "admin" },
  { phone: "+998901000002", labelKey: "mentor" },
  { phone: "+998901000003", labelKey: "student" },
] as const;

type ErrorBody = { detail?: string; title?: string };

export function LoginForm() {
  const t = useTranslations("auth");
  const [phone, setPhone] = useState("+998901000001");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp] = useState("");
  const [devTotp, setDevTotp] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-semibold text-navy-900">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("text")}</p>
      </div>
      <form onSubmit={requestCode} className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 shadow-sh1">
        <TextField label={t("phone")} name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
        <div className="flex flex-wrap gap-2">
          {DEMOS.map((item) => (
            <button
              key={item.phone}
              type="button"
              className="rounded-sm border border-line bg-canvas px-3 py-2 text-sm"
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
          <p className="rounded-sm bg-amber-100 px-3 py-3 text-ink" role="status">
            {t("codeShown")}: <strong className="font-mono text-lg">{devCode}</strong>
          </p>
        ) : null}
      </form>
      <form onSubmit={verifyCode} className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 shadow-sh1">
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
          className="flex flex-col gap-4 rounded-md border border-line bg-card p-5 shadow-sh1"
        >
          <TextField label={t("totp")} name="totp" inputMode="numeric" value={totp} onChange={(event) => setTotp(event.target.value)} />
          {devTotp ? (
            <p className="rounded-sm bg-amber-100 px-3 py-3 text-ink" role="status">
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
