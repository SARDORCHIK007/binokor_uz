import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { tradeImage } from "@/lib/media";

export type TradeTileData = { code: string; name: string; domestic_months: number; group_count?: number };

/** Compact horizontal trade tile: small photo thumb + name + chips + arrow. */
export function TradeTile({ trade, about, index }: { trade: TradeTileData; about?: string; index?: number }) {
  return (
    <Link
      href={`/kasblar/${trade.code}`}
      className="group relative flex items-center gap-4 rounded-2xl border border-line bg-card p-3 pr-4 shadow-sh1 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sh2"
    >
      <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-blue-50 ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tradeImage(trade.code)}
          alt=""
          className="size-full object-cover object-top transition duration-300 group-hover:scale-110"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          {index !== undefined ? (
            <span className="text-xs font-bold tabular-nums text-faint">{String(index + 1).padStart(2, "0")}</span>
          ) : null}
          <span className="truncate text-base font-bold text-navy-900 transition group-hover:text-primary">{trade.name}</span>
        </span>
        {about ? <span className="mt-0.5 line-clamp-1 block text-xs text-muted">{about}</span> : null}
        <span className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-primary">
            <Icon name="clock" className="size-3.5" />
            {trade.domestic_months} oy
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5 text-muted">
            <Icon name="users" className="size-3.5" />
            {trade.group_count ?? 0} guruh
          </span>
        </span>
      </span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 text-primary transition group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-white">
        <Icon name="arrow" className="size-4" />
      </span>
    </Link>
  );
}
