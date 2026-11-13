"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { TaskInbox } from "@/components/people/TaskInbox";
import { Badge, CARD, Tile, initials, type Tone } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type MahallaData = {
  mahallas: { id: string; name: string }[];
  kpi: Record<string, number>;
  candidates: { id: string; person_id: string; name: string; trade: string; status: string; source: string; date: string; mahalla: string; studying: boolean; certified: boolean }[];
  trades: { code: string; name: string }[];
  by_mahalla: { id: string; name: string; people: number; applications: number; studying: number; certified: number; employed: number }[];
};

const WAITING = new Set(["SUBMITTED", "SCREENING", "VOUCHER_CHECK", "INTERVIEW", "TRIAL", "WAITLIST"]);
const ACCEPTED = new Set(["ACCEPTED", "ENROLLED"]);
const REJECTED = new Set(["REJECTED", "WITHDRAWN"]);

const KPIS = ["people", "applications", "waiting", "studying", "certified", "employed"] as const;
const TONES: Tone[] = ["blue", "blue", "amber", "blue", "green", "green"];
const STATUS_TONE: Record<string, Tone> = { ACCEPTED: "green", ENROLLED: "green", REJECTED: "red", WITHDRAWN: "red", WAITLIST: "gray" };

export function MahallaPanel({ initial }: { initial: MahallaData }) {
  const t = useTranslations("mp");
  const adm = useTranslations("adm");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"" | "waiting" | "accepted" | "rejected">("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const group = (status: string) => (WAITING.has(status) ? "waiting" : ACCEPTED.has(status) ? "accepted" : REJECTED.has(status) ? "rejected" : "waiting");
    return data.candidates
      .filter((item) => !filter || group(item.status) === filter)
      .filter((item) => !needle || `${item.name} ${item.trade}`.toLowerCase().includes(needle));
  }, [data.candidates, query, filter]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setNote(null);
    const result = await send<{ detail?: string }>("/api/v1/mahalla/candidates", "POST", {
      mahalla_id: form.get("mahalla"),
      last_name: form.get("last"),
      first_name: form.get("first"),
      birth_date: form.get("birth"),
      phone: String(form.get("phone") ?? "").replace(/\s/g, ""),
      trade_code: form.get("trade"),
      track: form.get("track"),
      experience_years: Number(form.get("exp") || 0),
      has_language: form.get("lang") === "on",
      consent_confirmed: form.get("consent") === "on",
    });
    setSaving(false);
    if (result.ok) {
      setNote({ ok: true, text: t("saved") });
      formElement.reset();
      const fresh = await send<MahallaData>(`/api/v1/mahalla/overview?lang=${locale}`, "GET");
      if (fresh.ok && fresh.data) setData(fresh.data);
    } else {
      setNote({ ok: false, text: result.status === 409 ? t("err409") : t("errGeneric") });
    }
  }

  if (data.mahallas.length === 0) return <EmptyState title={t("noMahalla")} text="" />;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        {t("mahallas")}: <span className="font-bold text-navy-900">{data.mahallas.map((item) => item.name).join(", ")}</span>
      </p>
      <TaskInbox />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
        {KPIS.map((key, index) => (
          <Tile key={key} label={t(`kpi.${key}`)} value={data.kpi[key] ?? 0} tone={TONES[index]} />
        ))}
      </div>

      <section className={CARD} aria-labelledby="funnel">
        <h2 id="funnel" className="text-lg font-extrabold text-navy-900">{t("funnel")}</h2>
        <ol className="mt-4 flex flex-col gap-2.5">
          {(["people", "applications", "studying", "certified", "employed"] as const).map((key) => {
            const peak = Math.max(1, data.kpi.people ?? 0, data.kpi.applications ?? 0);
            const value = data.kpi[key] ?? 0;
            return (
              <li key={key} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate font-semibold text-navy-900">{t(`kpi.${key}`)}</span>
                <span className="h-3 overflow-hidden rounded-full bg-surface-100">
                  <span className="block h-3 rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, (100 * value) / peak)}%` }} />
                </span>
                <span className="text-right font-bold text-navy-900 tabular-nums">{value}</span>
              </li>
            );
          })}
        </ol>
        {data.by_mahalla.length > 1 ? (
          <div className="mt-5 overflow-x-auto">
            <h3 className="text-sm font-bold text-navy-900">{t("byMahalla")}</h3>
            <table className="mt-2 w-full min-w-[30rem] text-sm">
              <tbody className="divide-y divide-line">
                {data.by_mahalla.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className="py-2 text-left font-bold text-navy-900">{row.name}</th>
                    <td className="py-2 text-right tabular-nums text-muted">{t("kpi.applications")}: <b className="text-navy-900">{row.applications}</b></td>
                    <td className="py-2 text-right tabular-nums text-muted">{t("kpi.studying")}: <b className="text-navy-900">{row.studying}</b></td>
                    <td className="py-2 text-right tabular-nums text-muted">{t("kpi.certified")}: <b className="text-navy-900">{row.certified}</b></td>
                    <td className="py-2 text-right tabular-nums text-muted">{t("kpi.employed")}: <b className="text-navy-900">{row.employed}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className={CARD} aria-labelledby="add">
        <h2 id="add" className="text-xl font-extrabold text-navy-900">{t("addTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("addText")}</p>
        <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.mahalla")}
            <select name="mahalla" className={FIELD} required>
              {data.mahallas.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.last")}
            <input name="last" className={FIELD} required minLength={2} maxLength={80} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.first")}
            <input name="first" className={FIELD} required minLength={2} maxLength={80} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.birth")}
            <input name="birth" type="date" className={FIELD} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.phone")}
            <input name="phone" inputMode="tel" placeholder="+998901234567" className={FIELD} required />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.trade")}
            <select name="trade" className={FIELD} required>
              {data.trades.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.track")}
            <select name="track" className={FIELD}>
              <option value="DOMESTIC">{t("track.DOMESTIC")}</option>
              <option value="FOREIGN">{t("track.FOREIGN")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("f.exp")}
            <input name="exp" type="number" min={0} max={40} step="0.5" defaultValue={0} className={FIELD} />
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold text-navy-900">
            <input name="lang" type="checkbox" className="size-4 accent-[var(--primary)]" />
            {t("f.lang")}
          </label>
          <label className="flex items-start gap-2 text-sm font-semibold text-navy-900 md:col-span-2 xl:col-span-3">
            <input name="consent" type="checkbox" required className="mt-0.5 size-4 accent-[var(--primary)]" />
            {t("f.consent")}
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-3">
            <Button type="submit" disabled={saving}>{saving ? t("saving") : t("save")}</Button>
            {note ? (
              <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
                {note.ok ? "✓ " : ""}
                {note.text}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section aria-labelledby="list" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list" className="text-xl font-extrabold text-navy-900">{t("listTitle")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(["", "waiting", "accepted", "rejected"] as const).map((key) => (
              <button
                key={key || "all"}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold ${filter === key ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
              >
                {key === "" ? t("filterAll") : key === "waiting" ? t("filterWaiting") : key === "accepted" ? t("filterAccepted") : t("filterRejected")}
              </button>
            ))}
            <a href="/api/v1/mahalla/export.csv" className="rounded-xl border border-line-strong bg-card px-3 py-1.5 text-sm font-bold text-navy-900 hover:border-primary hover:text-primary">
              ⤓ {t("export")}
            </a>
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            aria-label={t("search")}
            className={`${FIELD} max-w-xs`}
          />
        </div>
        {shown.length === 0 ? (
          <EmptyState title={t("empty")} text={t("emptyText")} />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {shown.map((item) => (
              <li key={item.id} className={`${CARD} flex items-center gap-3`}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                  {initials(item.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/kabinet/shaxs/${item.person_id}`} className="block truncate font-bold text-navy-900 hover:text-primary">{item.name}</Link>
                  <p className="truncate text-sm text-muted">
                    {item.trade} · {item.mahalla} · {item.date}
                  </p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone={STATUS_TONE[item.status] ?? "amber"}>{adm(`appStatus.${item.status}` as "appStatus.DRAFT")}</Badge>
                    <Badge tone="gray">{t(`source.${item.source}` as "source.MAHALLA")}</Badge>
                    {item.studying ? <Badge tone="blue">{t("studying")}</Badge> : null}
                    {item.certified ? <Badge tone="green">{t("certified")}</Badge> : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
