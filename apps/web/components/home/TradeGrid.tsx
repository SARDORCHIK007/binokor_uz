"use client";

import { useState } from "react";
import { TradeTile } from "@/components/home/TradeTile";

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

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((trade) => (
          <li key={trade.code}>
            <TradeTile trade={trade} about={about[trade.code]} index={trades.indexOf(trade)} />
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-white p-12 text-center">
          <p className="text-lg font-bold text-navy-900">Mos keluvchi kasb topilmadi</p>
          <p className="mt-1 text-sm text-muted">Qidiruv so&apos;zini o&apos;zgartirib ko&apos;ring</p>
        </div>
      ) : null}
    </div>
  );
}
