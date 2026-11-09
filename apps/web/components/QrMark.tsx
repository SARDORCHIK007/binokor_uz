"use client";

import { useEffect, useState } from "react";

export function QrMark({ value }: { value: string }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let stop = false;
    void import("qrcode")
      .then(async (qr) => {
        const markup = await qr.toString(value, { type: "svg", margin: 1, width: 180 });
        if (!stop) {
          setSvg(markup);
        }
      })
      .catch(() => {
        // fallback agar kutubxona yuklanmasa
      });
    return () => {
      stop = true;
    };
  }, [value]);

  if (svg) {
    return <div className="size-44" dangerouslySetInnerHTML={{ __html: svg }} />;
  }

  // Standart yuqori aniqlikdagi QR SVG belgisi (Fallback)
  return (
    <svg viewBox="0 0 100 100" className="size-44 drop-shadow-sm" fill="#071833">
      {/* 3 ta burchakdagi katta QR kvadratlar */}
      <rect x="10" y="10" width="28" height="28" rx="4" fill="none" stroke="#071833" strokeWidth="6" />
      <rect x="18" y="18" width="12" height="12" rx="2" fill="#071833" />

      <rect x="62" y="10" width="28" height="28" rx="4" fill="none" stroke="#071833" strokeWidth="6" />
      <rect x="70" y="18" width="12" height="12" rx="2" fill="#071833" />

      <rect x="10" y="62" width="28" height="28" rx="4" fill="none" stroke="#071833" strokeWidth="6" />
      <rect x="18" y="70" width="12" height="12" rx="2" fill="#071833" />

      {/* Ichki QR piksellar to'ri */}
      <rect x="44" y="12" width="6" height="6" />
      <rect x="52" y="20" width="6" height="6" />
      <rect x="44" y="28" width="6" height="6" />

      <rect x="12" y="44" width="6" height="6" />
      <rect x="24" y="44" width="6" height="6" />
      <rect x="32" y="52" width="6" height="6" />

      <rect x="44" y="44" width="12" height="12" fill="#2F6BFF" />
      <rect x="60" y="44" width="6" height="6" />
      <rect x="72" y="44" width="8" height="6" />
      <rect x="84" y="52" width="6" height="6" />

      <rect x="44" y="62" width="6" height="6" />
      <rect x="52" y="70" width="8" height="6" />
      <rect x="44" y="82" width="6" height="6" />

      <rect x="62" y="62" width="8" height="8" />
      <rect x="76" y="62" width="6" height="6" />
      <rect x="68" y="76" width="12" height="6" />
      <rect x="62" y="84" width="6" height="6" />
      <rect x="80" y="82" width="8" height="8" />
    </svg>
  );
}
