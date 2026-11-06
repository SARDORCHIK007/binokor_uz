export function PresenceToggle({
  name,
  present,
  presentLabel,
  absentLabel,
  onToggle,
}: {
  name: string;
  present: boolean;
  presentLabel: string;
  absentLabel: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3">
      <span className="text-base font-medium text-ink">{name}</span>
      <button
        type="button"
        aria-pressed={present}
        onClick={onToggle}
        className={
          present
            ? "min-h-14 min-w-28 rounded-sm bg-success-100 px-4 text-base font-semibold text-success-600 focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
            : "min-h-14 min-w-28 rounded-sm bg-surface-100 px-4 text-base font-semibold text-muted focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
        }
      >
        {present ? presentLabel : absentLabel}
      </button>
    </div>
  );
}
