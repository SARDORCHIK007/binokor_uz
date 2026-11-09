"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const AVAILABILITY = ["FREE", "BUSY", "INACTIVE"] as const;
const KEYS = ["photo", "ratings", "full_name", "languages", "portfolio"] as const;

type Props = { availability: string; visibility: Record<string, boolean> };

/** Availability and what the public profile shows; saved immediately, phone is not an option (BR-17). */
export function WorkerSettings({ availability, visibility }: Props) {
  const t = useTranslations("workerProfile");
  const [status, setStatus] = useState(availability);
  const [shown, setShown] = useState(visibility);
  const [note, setNote] = useState<"" | "saved" | "failed">("");

  async function save(body: unknown) {
    const response = await fetch("/api/v1/me/worker", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setNote(response.ok ? "saved" : "failed");
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-sm font-bold text-navy-900">{t("availability")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVAILABILITY.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={status === code}
              onClick={() => {
                setStatus(code);
                void save({ availability: code });
              }}
              className={`min-h-11 rounded-full border px-4 text-sm font-bold ${
                status === code ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"
              }`}
            >
              {t(`availabilities.${code}` as "availabilities.FREE")}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-bold text-navy-900">{t("privacy")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {KEYS.map((key) => (
            <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-card px-3 text-sm font-semibold text-navy-900">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={Boolean(shown[key])}
                onChange={(event) => {
                  const next = { ...shown, [key]: event.target.checked };
                  setShown(next);
                  void save({ visibility: { [key]: event.target.checked } });
                }}
              />
              {t(`privacyKeys.${key}` as "privacyKeys.photo")}
            </label>
          ))}
        </div>
      </fieldset>
      <p role="status" className={`min-h-5 text-xs font-semibold ${note === "failed" ? "text-danger-600" : "text-success-600"}`}>
        {note === "saved" ? t("saved") : note === "failed" ? t("failed") : ""}
      </p>
    </div>
  );
}
