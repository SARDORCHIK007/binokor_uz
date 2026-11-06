export function TradeMark({ code }: { code: string }) {
  const shapes: Record<string, string> = {
    bricklayer: "M8 28h16l2-8H6z M10 18h12v-6H10z",
    carpenter: "M8 28l8-20 8 20z M12 18h8",
    concrete: "M6 26h20v4H6z M10 14h12v12H10z",
    drafting: "M8 28l16-16 M8 20h8 M16 28V16",
    electrician: "M16 6v8l6 4-6 4v8",
    painter: "M8 10h12v6H8z M14 16v14",
    plasterer: "M6 22c6-8 14-8 20 0v6H6z",
    plumber: "M10 8h8v6H10z M14 14v10 M10 24h8",
    rebar: "M8 8v16 M16 8v16 M24 8v16 M8 16h16",
    roofer: "M4 20 L16 8l12 12v8H4z",
    tiler: "M8 10h6v6H8z M16 10h8v6h-8z M8 18h6v6H8z M16 18h8v6h-8z",
    welder: "M8 24l8-14 8 14 M12 18h8",
  };
  return (
    <svg viewBox="0 0 32 32" className="size-16" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#E7EEF7" />
      <path d={shapes[code] ?? shapes.bricklayer} fill="none" stroke="#0C1B33" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
