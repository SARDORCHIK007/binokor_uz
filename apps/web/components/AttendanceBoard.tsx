"use client";

import { Button, OfflineBanner, PresenceToggle } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { attendanceNames } from "@/lib/demo";

export function AttendanceBoard() {
  const t = useTranslations("attendance");
  const [present, setPresent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(attendanceNames.map((name) => [name, name !== "Davron S."])),
  );
  const [hours, setHours] = useState(6);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  const [saved, setSaved] = useState(false);
  const [offline, setOffline] = useState(false);

  return (
    <form
      className="mx-auto flex min-h-[70vh] max-w-md flex-col px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      <p className="text-sm text-muted">{t("place")}</p>
      <div className="mt-3">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => setPresent(Object.fromEntries(attendanceNames.map((name) => [name, true])))}
        >
          {t("allPresent")}
        </Button>
      </div>
      <div className="mt-2">
        {attendanceNames.map((name) => (
          <div key={name}>
            <PresenceToggle
              name={name}
              present={present[name] ?? false}
              presentLabel={t("present")}
              absentLabel={t("absent")}
              onToggle={() => setPresent((current) => ({ ...current, [name]: !current[name] }))}
            />
            {present[name] === false ? (
              <label className="mb-2 block text-sm text-muted">
                {t("reason")}
                <select className="mt-1 min-h-11 w-full rounded-sm border border-line bg-card px-3" defaultValue="sick">
                  <option value="sick">{t("sick")}</option>
                  <option value="unexcused">{t("unexcused")}</option>
                </select>
              </label>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-base font-medium">{t("hours")}</span>
        <span className="flex items-center gap-3">
          <button type="button" className="size-14 rounded-sm border border-line text-xl" onClick={() => setHours((value) => Math.max(0, value - 1))}>
            −
          </button>
          <span className="w-8 text-center text-xl font-bold tabular-nums">{hours}</span>
          <button type="button" className="size-14 rounded-sm border border-line text-xl" onClick={() => setHours((value) => Math.min(12, value + 1))}>
            +
          </button>
        </span>
      </div>
      {offline ? (
        <div className="mt-4">
          <OfflineBanner text={t("offline")} />
        </div>
      ) : null}
      <div className="mt-4">
        <Button type="submit" size="lg" className="w-full">
          {t("submit")}
        </Button>
        {saved ? <p className="mt-3 text-sm text-success-600">{t("saved")}</p> : null}
      </div>
    </form>
  );
}
