"use client";

const COLORS = ["#2F6BFF", "#F5B400", "#1f8a4c", "#8a9bb8", "#7c5cbf", "#e07a3d"];

export function AdminCharts({
  trend,
  trades,
}: {
  trend: { name: string; value: number }[];
  trades: { name: string; value: number }[];
}) {
  const slices = trades.filter((item) => item.value > 0).slice(0, 6);
  const total = slices.reduce((sum, item) => sum + item.value, 0);

  const width = 460;
  const left = 36;
  const top = 20;
  const bottom = 180;
  const max = Math.max(1, ...trend.map((item) => item.value));
  const step = trend.length > 1 ? (width - left - 20) / (trend.length - 1) : 0;
  const points = trend.map((item, index) => ({
    x: left + index * step,
    y: bottom - (item.value / max) * (bottom - top),
    ...item,
  }));
  const line = points.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = points.length > 0 ? `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z` : "";

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-navy-900">Arizalar dinamikasi</h2>
        <div className="mt-4 h-60 w-full">
          {points.length === 0 ? (
            <p className="text-sm text-muted">Ma&apos;lumot yo&apos;q.</p>
          ) : (
            <svg viewBox={`0 0 ${width} 220`} className="h-full w-full overflow-visible" role="img" aria-label="Arizalar dinamikasi">
              <defs>
                <linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2F6BFF" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2F6BFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1={left} y1={bottom} x2={width - 10} y2={bottom} stroke="var(--border)" />
              <text x="4" y={top + 4} className="fill-faint text-[10px]">{max}</text>
              <text x="4" y={bottom + 4} className="fill-faint text-[10px]">0</text>
              <path d={area} fill="url(#adminArea)" />
              <path d={line} fill="none" stroke="#2F6BFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p) => (
                <g key={p.name}>
                  <circle cx={p.x} cy={p.y} r="5" fill="var(--card)" stroke="#2F6BFF" strokeWidth="3" />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-ink text-[11px] font-bold">{p.value}</text>
                  <text x={p.x} y={205} textAnchor="middle" className="fill-muted text-[11px] font-semibold">{p.name}</text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <h2 className="text-base font-extrabold text-navy-900">Tinglovchilar kasb bo&apos;yicha</h2>
        {slices.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Ma&apos;lumot hali yo&apos;q.</p>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <div className="relative grid size-44 place-items-center">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label="Kasblar ulushi">
                {slices.map((item, index) => {
                  const length = (item.value / total) * circumference;
                  const circle = (
                    <circle
                      key={item.name}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth="16"
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += length;
                  return circle;
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-black text-navy-900">{total}</span>
                <span className="mt-1 text-[11px] font-semibold text-muted">jami</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs">
              {slices.map((item, index) => (
                <li key={item.name} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 font-medium text-navy-900">
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="font-bold text-navy-900 tabular-nums">{Math.round((item.value / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
