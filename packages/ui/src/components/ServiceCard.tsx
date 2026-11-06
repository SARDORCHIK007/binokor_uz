import type { ReactNode } from "react";
import { cx } from "../cx";

export function ServiceCard({
  title,
  text,
  icon,
  className,
}: {
  title: string;
  text: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "flex h-full items-start gap-3 rounded-md border border-line bg-card p-4 shadow-sh1",
        "transition-shadow duration-150 group-hover:shadow-sh2",
        className,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-blue-50 text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-base font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-sm text-muted">{text}</span>
      </span>
      <span aria-hidden="true" className="ml-auto text-primary">
        →
      </span>
    </span>
  );
}
