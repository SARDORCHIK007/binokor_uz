"use client";

export function FunnelChart({ rows }: { rows: { name: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2">
      {rows.map((row) => {
        const heightPct = Math.max(10, Math.round((row.value / max) * 100));
        return (
          <div key={row.name} className="flex-1 flex flex-col items-center h-full justify-end group">
            <span className="text-xs font-bold text-[#071833] mb-1.5 opacity-0 group-hover:opacity-100 transition">
              {row.value}
            </span>
            <div
              className="w-full max-w-[48px] rounded-t-xl bg-[#0C1B33] group-hover:bg-[#2F6BFF] transition-all duration-300"
              style={{ height: `${heightPct}%` }}
            />
            <span className="text-[11px] font-semibold text-[#5f6b7d] mt-2 truncate max-w-full">
              {row.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
