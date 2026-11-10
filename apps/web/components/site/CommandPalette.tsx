"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";
import { cabinetIcon, PORTAL_LINKS } from "@/components/site/AppSidebar";
import type { ShellUser } from "@/components/site/SiteLayoutShell";

type Entry = { id: string; label: string; hint: string; icon: IconName; run: () => void };

const CERT = /^[A-Za-z]{2,4}-\d{4}-\d{3,8}$/;

/** Ctrl+K quick switcher: pages, certificate numbers and free-text search from anywhere. */
export function CommandPalette({ user, open, onClose }: { user: ShellUser | null; open: boolean; onClose: () => void }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      window.setTimeout(() => input.current?.focus(), 20);
    }
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const list: Entry[] = [];
    for (const item of user?.items ?? []) {
      list.push({ id: item.href, label: item.label, hint: t("cabinet"), icon: cabinetIcon(item.href), run: go(item.href) });
    }
    for (const item of PORTAL_LINKS) {
      list.push({ id: `p${item.href}`, label: t(item.label as "home"), hint: t("platform"), icon: item.icon, run: go(item.href) });
    }
    return list;
  }, [user, t, router, onClose]);

  const text = query.trim();
  const shown = useMemo(() => {
    const needle = text.toLowerCase();
    const matched = needle ? entries.filter((entry) => entry.label.toLowerCase().includes(needle)) : entries.slice(0, 8);
    const extra: Entry[] = [];
    if (text) {
      const target = CERT.test(text) ? `/verify/${encodeURIComponent(text.toUpperCase())}` : `/qidiruv?q=${encodeURIComponent(text)}`;
      extra.push({
        id: "search",
        label: CERT.test(text) ? t("paletteVerify", { q: text.toUpperCase() }) : t("paletteSearch", { q: text }),
        hint: t("verify"),
        icon: "qr",
        run: () => {
          onClose();
          router.push(target);
        },
      });
    }
    return [...extra, ...matched];
  }, [entries, text, t, router, onClose]);

  function onKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((value) => Math.min(value + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      shown[cursor]?.run();
    } else if (event.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label={t("paletteTitle")}>
      <button type="button" className="fixed inset-0 bg-navy-900/60" onClick={onClose} aria-label={t("close")} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-card shadow-sh3">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="qr" className="size-4 shrink-0 text-muted" />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKey}
            placeholder={t("palettePlaceholder")}
            aria-label={t("paletteTitle")}
            className="h-14 w-full bg-transparent text-base text-navy-900 placeholder:text-muted focus:outline-none"
          />
          <kbd className="rounded-md border border-line bg-surface-100 px-1.5 py-0.5 text-[11px] font-bold text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {shown.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted">{t("paletteEmpty")}</li> : null}
          {shown.map((entry, index) => (
            <li key={entry.id} role="option" aria-selected={index === cursor}>
              <button
                type="button"
                onClick={entry.run}
                onMouseEnter={() => setCursor(index)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  index === cursor ? "bg-blue-50 text-primary" : "text-navy-900"
                }`}
              >
                <Icon name={entry.icon} className="size-4 shrink-0" />
                <span className="flex-1 truncate">{entry.label}</span>
                <span className="text-xs font-medium text-muted">{entry.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
