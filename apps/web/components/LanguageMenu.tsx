"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Flag } from "@/components/Flag";

type Code = "uz-Latn" | "uz-Cyrl" | "ru" | "en";

const LANGS: { code: Code; flag: string; short: string; name: string }[] = [
  { code: "uz-Latn", flag: "UZ", short: "UZ", name: "O'zbekcha" },
  { code: "uz-Cyrl", flag: "UZ", short: "ЎЗ", name: "Ўзбекча" },
  { code: "ru", flag: "RU", short: "RU", name: "Русский" },
  { code: "en", flag: "GB", short: "EN", name: "English" },
];

export function LanguageMenu() {
  const t = useTranslations("shell");
  const locale = useLocale();
  const current = LANGS.find((item) => item.code === locale) ?? LANGS[0];
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("/");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNext(window.location.pathname + window.location.search);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("language")}
        className="flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-100 px-2.5 text-sm font-bold text-navy-900 transition hover:border-primary"
      >
        <Flag code={current.flag} />
        <span className="hidden sm:inline">{current.short}</span>
        <span aria-hidden="true" className={`text-[10px] text-muted transition ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open ? (
        <ul role="menu" className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-line bg-card p-1 shadow-sh3">
          {LANGS.map((item) => (
            <li key={item.code} role="none">
              <a
                role="menuitem"
                href={`/til?locale=${item.code}&next=${encodeURIComponent(next)}`}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-blue-50 ${
                  item.code === current.code ? "text-primary" : "text-navy-900"
                }`}
              >
                <Flag code={item.flag} />
                <span className="flex-1">{item.name}</span>
                {item.code === current.code ? <span aria-hidden="true">✓</span> : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
