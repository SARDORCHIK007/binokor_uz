export function OfflineBanner({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-sm bg-amber-100 px-3 py-3 text-sm font-medium text-amber-600" role="status">
      <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
        <path d="M8 2.5 14 13.5H2L8 2.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7v3M8 11.5h.01" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {text}
    </p>
  );
}
