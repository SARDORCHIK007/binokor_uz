"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";

export type FilterItem = { key: string; search: string; group: string; node: ReactNode };
export type FilterGroup = { value: string; label: string };

type Props = {
  items: FilterItem[];
  groups?: FilterGroup[];
  placeholder?: string;
  layout?: "list" | "grid";
};

/** Search box + filter chips over server-rendered rows. Filtering is instant and needs no request. */
export function FilterableList({ items, groups = [], placeholder, layout = "list" }: Props) {
  const t = useTranslations("adm");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("*");

  const counts = useMemo(() => {
    const result: Record<string, number> = { "*": items.length };
    for (const item of items) result[item.group] = (result[item.group] ?? 0) + 1;
    return result;
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => (group === "*" || item.group === group) && (needle === "" || item.search.toLowerCase().includes(needle)));
  }, [items, query, group]);

  const chips: FilterGroup[] = groups.length > 0 ? [{ value: "*", label: t("all") }, ...groups] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder ?? t("search")}
            aria-label={placeholder ?? t("search")}
            className="min-h-11 w-full rounded-xl border border-line-strong bg-card py-2 pr-3.5 pl-9 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        {chips.length > 0 ? (
          <div role="group" className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                aria-pressed={group === chip.value}
                onClick={() => setGroup(chip.value)}
                className={`min-h-10 rounded-full border px-3.5 text-sm font-bold transition ${
                  group === chip.value ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"
                }`}
              >
                {chip.label}
                <span className={`ml-1.5 text-xs tabular-nums ${group === chip.value ? "text-white/80" : "text-muted"}`}>{counts[chip.value] ?? 0}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p role="status" className="rounded-2xl border border-dashed border-line-strong bg-card p-8 text-center text-sm text-muted">
          {t("noResults")}
        </p>
      ) : (
        <ul className={layout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3"}>
          {visible.map((item) => (
            <li key={item.key} className="min-w-0">
              {item.node}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
