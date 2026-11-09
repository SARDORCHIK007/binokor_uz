"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Bell in the top bar with the number of unread in-app notifications (signed-in users only). */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    function load() {
      void fetch("/api/v1/me/notifications", { credentials: "include" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { unread: number } | null) => {
          if (alive) setUnread(data ? data.unread : null);
        })
        .catch(() => undefined);
    }
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  if (unread === null) return null;
  return (
    <Link
      href="/kabinet/bildirishnomalar"
      aria-label={`${t("bell")}${unread > 0 ? `: ${unread}` : ""}`}
      className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-navy-700 text-white transition hover:bg-primary"
    >
      <span aria-hidden="true">🔔</span>
      {unread > 0 ? (
        <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-navy-900">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
