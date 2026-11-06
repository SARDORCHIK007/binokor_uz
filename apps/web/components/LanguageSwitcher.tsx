"use client";

import { useEffect, useState } from "react";

const LOCALES = [
  ["uz-Latn", "UZ"],
  ["uz-Cyrl", "ЎЗ"],
  ["ru", "RU"],
  ["en", "EN"],
] as const;

export function LanguageSwitcher() {
  const [next, setNext] = useState("/");
  useEffect(() => {
    setNext(window.location.pathname + window.location.search);
  }, []);
  return (
    <span className="flex gap-1 text-sm">
      {LOCALES.map(([locale, label]) => (
        <a
          key={locale}
          className="rounded-sm px-2 py-2 hover:bg-blue-50"
          href={`/til?locale=${locale}&next=${encodeURIComponent(next)}`}
        >
          {label}
        </a>
      ))}
    </span>
  );
}
