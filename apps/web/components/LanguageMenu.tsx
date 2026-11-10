"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type Code = "uz-Latn" | "uz-Cyrl" | "ru" | "en";

const LANGS: { code: Code; short: string; name: string }[] = [
  { code: "uz-Latn", short: "UZ", name: "O'zbekcha" },
  { code: "uz-Cyrl", short: "ЎЗ", name: "Ўзбекча" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
];

/** Small round flags drawn as SVG (emoji flags do not render on Windows). */
export function Flag({ code, className = "size-5" }: { code: Code; className?: string }) {
  const id = `fl-${code}`;
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 rounded-full ring-1 ring-black/10`} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {code === "ru" ? (
          <>
            <rect width="24" height="8" fill="#fff" />
            <rect y="8" width="24" height="8" fill="#0039a6" />
            <rect y="16" width="24" height="8" fill="#d52b1e" />
          </>
        ) : code === "en" ? (
          <>
            <rect width="24" height="24" fill="#012169" />
            <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="4" />
            <path d="M0 0 24 24M24 0 0 24" stroke="#c8102e" strokeWidth="1.6" />
            <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="7" />
            <path d="M12 0v24M0 12h24" stroke="#c8102e" strokeWidth="4" />
          </>
        ) : (
          <>
            <rect width="24" height="8" fill="#0099b5" />
            <rect y="8" width="24" height="8" fill="#fff" />
            <rect y="16" width="24" height="8" fill="#1eb53a" />
            <rect y="7.4" width="24" height="1.1" fill="#ce1126" />
            <rect y="15.5" width="24" height="1.1" fill="#ce1126" />
            <circle cx="6.5" cy="4" r="2.1" fill="#fff" />
            <circle cx="7.4" cy="4" r="1.8" fill="#0099b5" />
            <circle cx="10.2" cy="2.6" r="0.5" fill="#fff" />
            <circle cx="12" cy="4" r="0.5" fill="#fff" />
            <circle cx="10.2" cy="5.4" r="0.5" fill="#fff" />
          </>
        )}
      </g>
    </svg>
  );
}

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
        <Flag code={current.code} />
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
                <Flag code={item.code} />
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
