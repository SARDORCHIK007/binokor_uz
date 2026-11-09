import type { ReactNode } from "react";
import { cx } from "../cx";

export type StatusTone = "success" | "warning" | "danger" | "info";

const tones: Record<StatusTone, string> = {
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-danger-100 text-danger-600",
  info: "bg-blue-100 text-primary",
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      <StatusIcon tone={tone} />
      {children}
    </span>
  );
}

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4.5 8.2 7 10.5 11.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.5v4M8 11.2h.01" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (tone === "danger") {
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 5.5 10.5 10.5M10.5 5.5 5.5 10.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2.2" />
    </svg>
  );
}
