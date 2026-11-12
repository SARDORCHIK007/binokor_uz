import type { ReactNode } from "react";

/** Shared building blocks of the cabinet pages: one header, one badge, one stat tile, one card. */

export const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1";
export const CARD_HOVER = `${CARD} transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sh2`;

export function PageHead({ title, text, actions }: { title: string; text?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{title}</h1>
        {text ? <p className="mt-2 max-w-[66ch] text-muted">{text}</p> : null}
      </div>
      {actions}
    </header>
  );
}

const TONES = {
  blue: "bg-blue-100 text-primary",
  green: "bg-success-100 text-success-600",
  amber: "bg-warning-100 text-warning-600",
  red: "bg-danger-100 text-danger-600",
  gray: "bg-surface-100 text-muted",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${TONES[tone]}`}>{children}</span>;
}

export function Tile({ label, value, tone = "blue", hint }: { label: string; value: ReactNode; tone?: Tone; hint?: string }) {
  return (
    <div className={`${CARD} flex min-w-0 flex-col gap-2`}>
      <p className="text-sm leading-snug font-semibold break-words text-muted">{label}</p>
      <span className={`inline-flex w-fit min-w-12 items-center justify-center rounded-xl px-3 py-1.5 text-2xl font-extrabold tabular-nums ${TONES[tone]}`}>{value}</span>
      {hint ? <p className="text-xs break-words text-muted">{hint}</p> : null}
    </div>
  );
}

/** A thin progress bar; `value` is 0–100. */
export function Meter({ value, tone = "blue", label }: { value: number; tone?: Tone; label: string }) {
  const fill = tone === "green" ? "bg-success-600" : tone === "amber" ? "bg-accent" : tone === "red" ? "bg-danger-600" : "bg-primary";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className="h-2 overflow-hidden rounded-full bg-surface-100"
    >
      <div className={`h-2 rounded-full transition-all duration-700 ${fill}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
