"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge, CARD } from "@/components/cabinet/kit";
import { FIELD } from "@/lib/clientApi";

export type StudentRow = {
  id: string;
  name: string;
  group: string;
  teacher: string;
  trade: string;
  attendance: number | null;
  score: number | null;
  passed: number;
  hours: number;
  rank: number | null;
  risk: boolean;
};

export function StudentRatingTable({ rows }: { rows: StudentRow[] }) {
  const t = useTranslations("mon");
  const [group, setGroup] = useState("");
  const [query, setQuery] = useState("");
  const groups = useMemo(() => [...new Set(rows.map((row) => row.group))], [rows]);
  const shown = rows.filter((row) => (!group || row.group === group) && (!query || row.name.toLowerCase().includes(query.trim().toLowerCase())));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <select value={group} onChange={(event) => setGroup(event.target.value)} className={`${FIELD} max-w-56`} aria-label={t("col.group")}>
          <option value="">{t("allGroups")}</option>
          {groups.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} aria-label={t("search")} className={`${FIELD} max-w-xs`} />
      </div>
      {shown.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <div className={`${CARD} overflow-x-auto p-0`}>
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-4 py-3 font-semibold">{t("col.name")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.group")}</th>
                <th className="px-4 py-3 font-semibold">{t("col.teacher")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("col.attendance")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("col.avg")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("col.place")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("col.hours")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="px-4 py-3 text-left font-bold text-navy-900">
                    {row.name}
                    <span className="block text-xs font-normal text-muted">{row.trade}</span>
                  </th>
                  <td className="px-4 py-3">{row.group}</td>
                  <td className="px-4 py-3">{row.teacher}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.attendance === null ? "—" : <Badge tone={row.risk ? "red" : "green"}>{row.attendance}%</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{row.score ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.rank ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.some((row) => row.risk) ? <p className="text-xs text-muted">{t("risk")}</p> : null}
    </div>
  );
}
