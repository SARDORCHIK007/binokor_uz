import { cx } from "../cx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-sm bg-surface-100", className)} aria-hidden="true" />;
}
