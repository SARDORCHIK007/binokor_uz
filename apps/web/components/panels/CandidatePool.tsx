"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, initials } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type PoolPerson = {
  user_id: string;
  person_id: string | null;
  slug: string;
  name: string;
  trade: string;
  level: string;
  hours: number;
  rating: number | null;
  mahalla: string;
  certified: boolean;
  experience: number;
  languages: Record<string, number>;
  proposed: number;
  checks: { key: string; ok: boolean }[];
  fit: number | null;
};

type PoolData = { people: PoolPerson[]; trades: { code: string; name: string }[]; languages: string[] };

const LEVEL = ["", "A1", "A2", "B1", "B2", "C1", "C2"];

/** Checks of a person against the vacancy's requirements, shown as small green / red chips. */
export function FitChips({ person }: { person: PoolPerson }) {
  const t = useTranslations("ag");
  if (person.checks.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {person.fit !== null ? <Badge tone={person.fit >= 75 ? "green" : person.fit >= 50 ? "amber" : "red"}>{t("fit", { n: person.fit })}</Badge> : null}
      {person.checks.map((check) => (
        <Badge key={check.key} tone={check.ok ? "green" : "red"}>
          {check.ok ? "✓" : "✕"} {t(`check.${check.key}` as "check.level")}
        </Badge>
      ))}
    </span>
  );
}

export function CandidatePool({ initial, openVacancies, fixedVacancy, onAdded }: {
  initial: PoolData;
  openVacancies: { id: string; label: string }[];
  fixedVacancy?: string;
  onAdded?: () => void;
}) {
  const t = useTranslations("ag");
  const lang = useTranslations("vw");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [trade, setTrade] = useState("");
  const [certified, setCertified] = useState(false);
  const [freeOnly, setFreeOnly] = useState(true);
  const [language, setLanguage] = useState("");
  const [minLevel, setMinLevel] = useState(2);
  const [query, setQuery] = useState("");
  const [vacancy, setVacancy] = useState(fixedVacancy ?? "");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ lang: locale, free_only: String(freeOnly) });
    if (trade) params.set("trade", trade);
    if (certified) params.set("certified", "true");
    if (language) {
      params.set("language", language);
      params.set("min_language", String(minLevel));
    }
    if (query.trim()) params.set("q", query.trim());
    if (vacancy) params.set("vacancy", vacancy);
    const result = await send<PoolData>(`/api/v1/migration/pool?${params.toString()}`, "GET");
    if (result.ok && result.data) setData(result.data);
  }, [locale, trade, certified, freeOnly, language, minLevel, query, vacancy]);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  async function select(person: PoolPerson) {
    if (!vacancy) return;
    setBusy(person.user_id);
    setNote(null);
    const result = await send("/api/v1/panels/refer", "POST", { request_id: vacancy, worker_user_id: person.user_id });
    setBusy(null);
    setNote(result.ok ? { ok: true, text: t("pool.selected") } : { ok: false, text: t("pool.failed") });
    if (result.ok) {
      await load();
      onAdded?.();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`${CARD} grid gap-3 md:grid-cols-2 xl:grid-cols-4`}>
        {fixedVacancy ? null : (
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted xl:col-span-2">
            {t("pool.vacancy")}
            <select value={vacancy} onChange={(event) => setVacancy(event.target.value)} className={FIELD}>
              <option value="">{t("pool.noVacancy")}</option>
              {openVacancies.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
          {t("pool.trade")}
          <select value={trade} onChange={(event) => setTrade(event.target.value)} className={FIELD}>
            <option value="">{t("pool.allTrades")}</option>
            {data.trades.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
          {t("pool.search")}
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
          {t("pool.language")}
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className={FIELD}>
            <option value="">{t("pool.anyLanguage")}</option>
            {data.languages.map((code) => (
              <option key={code} value={code}>{lang.has(`lang.${code}` as "lang.ru") ? lang(`lang.${code}` as "lang.ru") : code}</option>
            ))}
          </select>
        </label>
        {language ? (
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("pool.minLevel")}
            <select value={minLevel} onChange={(event) => setMinLevel(Number(event.target.value))} className={FIELD}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{LEVEL[n]}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
          <input type="checkbox" checked={certified} onChange={(event) => setCertified(event.target.checked)} className="size-4 accent-[var(--primary)]" />
          {t("pool.certified")}
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
          <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} className="size-4 accent-[var(--primary)]" />
          {t("pool.freeOnly")}
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted">{t("pool.found", { n: data.people.length })}</p>
        {note ? (
          <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
            {note.ok ? "✓ " : ""}
            {note.text}
          </p>
        ) : null}
      </div>

      {data.people.length === 0 ? (
        <EmptyState title={t("pool.empty")} text="" />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.people.map((person) => (
            <li key={person.user_id} className={`${CARD} flex items-start gap-3`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                {initials(person.name)}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={person.person_id ? `/kabinet/shaxs/${person.person_id}` : `/ustalar/${person.slug}`} className="block truncate font-bold text-navy-900 hover:text-primary">
                  {person.name}
                </Link>
                <p className="text-sm text-muted">
                  {person.trade} · {t("pool.hours", { n: person.hours })}
                  {person.experience > 0 ? ` · ${t("pool.years", { n: person.experience })}` : ""}
                  {person.mahalla ? ` · ${person.mahalla}` : ""}
                </p>
                <p className="mt-1.5 flex flex-wrap gap-1.5">
                  {person.certified ? <Badge tone="green">{t("pool.certifiedBadge")}</Badge> : null}
                  {Object.entries(person.languages).map(([code, level]) => (
                    <Badge key={code} tone="blue">
                      {lang.has(`lang.${code}` as "lang.ru") ? lang(`lang.${code}` as "lang.ru") : code} {LEVEL[level] ?? level}
                    </Badge>
                  ))}
                  {person.proposed > 0 ? <Badge tone="gray">{t("pool.proposed", { n: person.proposed })}</Badge> : null}
                </p>
                <div className="mt-2">
                  <FitChips person={person} />
                </div>
              </div>
              {vacancy ? (
                <button type="button" disabled={busy === person.user_id} className={buttonClass()} onClick={() => void select(person)}>
                  {t("pool.select")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
