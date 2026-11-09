"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/brand/Icon";
import { tradeImage } from "@/lib/media";

export type TradeRow = { code: string; name: string; domestic_months: number; group_count?: number };

export function TradeGrid({ trades, about }: { trades: TradeRow[]; about: Record<string, string> }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = trades.filter((item) => item.name.toLowerCase().includes(needle));

  return (
    <div>
      <div className="w-full md:w-80">
        <label className="sr-only" htmlFor="trade-search">Kasb nomini qidirish</label>
        <input
          id="trade-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kasb nomini qidirish..."
          className="w-full rounded-2xl border border-line-strong bg-white px-4 py-3 text-sm text-navy-900 shadow-sm placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((trade) => (
          <Link
            key={trade.code}
            href={`/kasblar/${trade.code}`}
            className="group block overflow-hidden rounded-2xl border border-line bg-white shadow-sh2 transition duration-200 hover:-translate-y-1 hover:shadow-sh3"
          >
            <div className="h-44 overflow-hidden bg-[#0b1f3a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tradeImage(trade.code)} alt={trade.name} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" />
            </div>
            <div className="flex items-end justify-between gap-3 p-5">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-extrabold text-navy-900 transition group-hover:text-primary">{trade.name}</h2>
                <div className="mt-2 flex items-center gap-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-navy-900">
                    <Icon name="users" className="size-4 text-primary" />
                    {trade.group_count ?? 0} guruh
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{trade.domestic_months} oy</span>
                </div>
                {about[trade.code] ? <p className="mt-2 line-clamp-2 text-xs text-muted">{about[trade.code]}</p> : null}
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white shadow transition group-hover:translate-x-0.5 group-hover:bg-primary-hover">
                <Icon name="arrow" className="size-5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-white p-12 text-center">
          <p className="text-lg font-bold text-navy-900">Mos keluvchi kasb topilmadi</p>
          <p className="mt-1 text-sm text-muted">Qidiruv so&apos;zini o&apos;zgartirib ko&apos;ring</p>
        </div>
      ) : null}
    </div>
  );
}
