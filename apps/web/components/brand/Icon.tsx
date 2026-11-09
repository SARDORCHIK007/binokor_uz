const PATHS = {
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  cap: "M22 10 12 5 2 10l10 5 10-5z M6 12v5c3 2 9 2 12 0v-5",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8.5 14 7 22l5-3 5 3-1.5-8",
  briefcase: "M3 7h18v13H3z M8 7V4h8v3 M3 13h18",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18",
  check: "M5 12l5 5L20 7",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 5v16",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  doc: "M6 3h9l4 4v14H6z M14 3v5h5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  trend: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4",
  qr: "M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h3v3h-3z M19 14v6 M14 20h3",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  box: "M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10",
  brick: "M3 6h18v12H3z M3 10h18 M3 14h18 M9 6v4 M15 10v4 M9 14v4",
  layers: "M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17l9 5 9-5",
  hill: "M2 20h20 M4 20l6-10 4 6 2-3 4 7",
  pillar: "M6 3h12v4H6z M8 7v13 M16 7v13 M5 20h14",
  bars: "M4 5v14 M9 5v14 M14 5v14 M19 5v14 M2 9h20 M2 15h20",
  wood: "M3 7h14l4 5-4 5H3z M7 7v10 M11 7v10",
  roof: "M3 12l9-8 9 8 M5 10v10h14V10",
  snow: "M12 2v20 M4 7l16 10 M20 7L4 17",
  brush: "M18 3l3 3-9 9-3-3z M9 12l-4 4a2 2 0 0 0 3 3l4-4",
  tile: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  door: "M6 3h12v18H6z M14 12h.01",
  drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  screw: "M9 3h6l-1 4h-4z M10 7l4 2-4 2 4 2-4 2 4 2 M12 19v2",
  truck: "M2 6h12v10H2z M14 10h4l3 3v3h-7z M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  factory: "M2 21V10l6 4V10l6 4V6h8v15z M6 17h2 M11 17h2 M17 17h2",
  minus: "M5 12h14",
  plus: "M12 5v14 M5 12h14",
  close: "M6 6l12 12 M18 6L6 18",
  filter: "M3 5h18l-7 8v6l-4 2v-8z",
  cart: "M3 4h2l2.4 11h11.2L21 7H6.2 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
