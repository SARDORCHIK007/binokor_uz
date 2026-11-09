const SHAPES: Record<string, string> = {
  bricklayer: "M4 26h24 M6 20h20 M8 14h16 M4 26V20 M12 20v-6 M20 20v-6 M16 14V8",
  carpenter: "M6 26 22 6l4 4L10 30z M20 8l4 4",
  concrete: "M4 26h24v3H4z M8 10h16v16H8z M12 14h8 M12 18h8",
  drafting: "M6 26 24 8l3 3L9 29z M6 26l-1 3 3-1",
  electrician: "M18 4 8 18h8l-2 10 10-14h-8z",
  painter: "M6 6h18v8H6z M24 10h3v8H15v4 M13 22h4v7h-4z",
  plasterer: "M5 24c4-9 18-9 22 0v4H5z M10 20c2-5 10-5 12 0",
  plumber: "M6 10h12v6H6z M12 16v8h10 M22 20v8",
  rebar: "M7 6v20 M13 6v20 M19 6v20 M25 6v20 M5 12h22 M5 20h22",
  roofer: "M3 18 16 6l13 12 M6 17v11h20V17 M13 28v-7h6v7",
  tiler: "M5 5h10v10H5z M17 5h10v10H17z M5 17h10v10H5z M17 17h10v10H17z",
  welder: "M16 4l3 7 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z",
};

export function TradeMark({ code, className = "size-16" }: { code: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#E7EEF7" />
      <path d={SHAPES[code] ?? SHAPES.bricklayer} fill="none" stroke="#0C1B33" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const TONES = [
  ["#1b4fa8", "#0a2a63"],
  ["#0f6b78", "#083a49"],
  ["#7a4b12", "#3b2208"],
  ["#3c4f9c", "#1b2559"],
  ["#2d6a3f", "#133a22"],
  ["#8a2f3a", "#451018"],
];

/** Kasb kartochkasining yuqori qismi: chizma (rasm o'rniga), rang kasbga qarab. */
export function TradeBanner({ code, index }: { code: string; index: number }) {
  const [from, to] = TONES[index % TONES.length];
  return (
    <div className="relative grid h-36 place-items-center overflow-hidden rounded-t-[20px]" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} aria-hidden="true">
      <svg viewBox="0 0 32 32" className="size-24 opacity-95">
        <path d={SHAPES[code] ?? SHAPES.bricklayer} fill="none" stroke="#F5B400" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="absolute -right-6 -bottom-8 size-28 rounded-full bg-white/10" />
    </div>
  );
}
