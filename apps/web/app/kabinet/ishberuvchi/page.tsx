"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/Icon";

type Employer = { id: string; name: string; inn: string | null; verified: boolean };
type Demand = {
  id: string;
  quantity: number;
  status: string;
  track: string;
  as_brigade: boolean;
  location: string | null;
  start_date: string | null;
  duration_months: number | null;
  salary_from: number | null;
  salary_to: number | null;
  conditions: string | null;
  created_at: string;
  trade: string;
  candidates: number;
};
type Placement = { id: string; name: string };
type Trade = { code: string; name: string };
type MatchWorker = {
  user_id: string;
  slug: string;
  name: string;
  availability: string;
  rating: number | null;
  hours: number;
  score: number;
  reasons: string[];
};
type MatchBrigade = { id: string; name: string; members: number; rating: number | null; fits: boolean };
type Matches = { brigades: MatchBrigade[]; workers: MatchWorker[] };
type Candidate = { id: string; kind: "worker" | "brigade"; name: string; status: string; slug: string | null };

const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";
const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6";
const SCORES = ["quality", "discipline", "safety", "communication"] as const;

function money(value: number | null): string {
  return value === null ? "" : Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function post(url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export default function EmployerPage() {
  const t = useTranslations("employerCab");
  const states = useTranslations("states");
  const workerT = useTranslations("worker");
  const adm = useTranslations("adm");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [requests, setRequests] = useState<Demand[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [pending, setPending] = useState<Employer[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, Matches>>({});
  const [invited, setInvited] = useState<Record<string, Candidate[]>>({});
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/employers/me", { credentials: "include" });
      if (!response.ok) {
        throw new Error("load");
      }
      const body = (await response.json()) as { employer: Employer | null; requests: Demand[]; placements?: Placement[] };
      setEmployer(body.employer);
      setRequests(body.requests);
      setPlacements(body.placements ?? []);
      setState("ready");
      const admin = body.employer === null ? await fetch("/api/v1/admin/employers", { credentials: "include" }) : null;
      if (admin?.ok) {
        setIsAdmin(true);
        setPending(((await admin.json()) as Employer[]).filter((item) => !item.verified));
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/v1/public/home")
      .then((response) => response.json())
      .then((body: { trades?: Trade[] }) => setTrades(body.trades ?? []))
      .catch(() => setTrades([]));
  }, [load]);

  async function loadMatches(id: string) {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    const [m, c] = await Promise.all([
      fetch(`/api/v1/employers/requests/${id}/matches`, { credentials: "include" }),
      fetch(`/api/v1/employers/requests/${id}/candidates`, { credentials: "include" }),
    ]);
    if (m.ok) {
      const data = (await m.json()) as Matches;
      setMatches((prev) => ({ ...prev, [id]: data }));
    }
    if (c.ok) {
      const data = (await c.json()) as Candidate[];
      setInvited((prev) => ({ ...prev, [id]: data }));
    }
  }

  async function propose(requestId: string, body: { worker_user_id?: string; brigade_id?: string }) {
    const response = await post(`/api/v1/employers/requests/${requestId}/candidates`, body);
    setNote(response.ok ? t("proposed") : t("failed"));
    setOpen(null);
    await loadMatches(requestId);
    await load();
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await post("/api/v1/employers", { name: form.get("name"), inn: form.get("inn") });
    setNote(response.ok ? t("registered") : t("failed"));
    await load();
  }

  async function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const num = (key: string) => (form.get(key) ? Number(form.get(key)) : null);
    const response = await post("/api/v1/employers/requests", {
      trade_code: form.get("trade"),
      quantity: Number(form.get("quantity") ?? 1),
      as_brigade: form.get("as_brigade") === "on",
      track: form.get("track"),
      location: String(form.get("location") ?? ""),
      start_date: form.get("start_date") || null,
      duration_months: num("duration"),
      salary_from: num("salary_from"),
      salary_to: num("salary_to"),
      conditions: String(form.get("conditions") ?? ""),
    });
    if (response.ok) {
      const created = (await response.json()) as { id: string };
      setNote(t("sent"));
      event.currentTarget.reset();
      await load();
      await loadMatches(created.id);
    } else {
      const body = (await response.json().catch(() => ({}))) as { detail?: string };
      setNote(body.detail ?? t("failed"));
    }
  }

  async function review(event: FormEvent<HTMLFormElement>, placementId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await post(`/api/v1/employers/placements/${placementId}/review`, {
      ...Object.fromEntries(SCORES.map((key) => [key, Number(form.get(key) ?? 5)])),
      comment: String(form.get("comment") ?? ""),
    });
    setNote(response.ok ? t("reviewSaved") : t("failed"));
  }

  if (state === "loading") {
    return <div className="h-64 animate-pulse rounded-2xl bg-card" aria-label={states("loading")} />;
  }
  if (state === "error") {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
      {note ? (
        <p role="status" className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-navy-900">
          {note}
        </p>
      ) : null}

      {employer ? (
        <section className={`${CARD} flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-blue-100 text-primary">
              <Icon name="briefcase" className="size-6" />
            </span>
            <div>
              <p className="text-lg font-bold text-navy-900">{employer.name}</p>
              <p className="text-sm text-muted">
                {t("inn")} {employer.inn}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${employer.verified ? "bg-success-100 text-success-600" : "bg-warning-100 text-warning-600"}`}>
            {employer.verified ? t("verified") : t("unverified")}
          </span>
        </section>
      ) : isAdmin ? (
        pending.length === 0 ? (
          <p className={`${CARD} text-sm text-muted`}>{adm("employers.noPending")}</p>
        ) : null
      ) : (
        <form onSubmit={register} className={`${CARD} grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
          <h2 className="text-lg font-bold text-navy-900 sm:col-span-3">{t("register")}</h2>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("companyName")}
            <input name="name" required minLength={2} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("inn")}
            <input name="inn" required minLength={9} maxLength={14} inputMode="numeric" className={FIELD} />
          </label>
          <button type="submit" className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover">
            {t("registerAction")}
          </button>
        </form>
      )}

      {employer ? (
        <section className={CARD}>
          <h2 className="text-xl font-bold text-navy-900">{t("requests")}</h2>
          {requests.length === 0 ? <p className="mt-2 text-sm text-muted">{t("noRequests")}</p> : null}
          <ul className="mt-4 flex flex-col gap-3">
            {requests.map((item) => {
              const data = matches[item.id];
              const list = invited[item.id] ?? [];
              return (
                <li key={item.id} className="rounded-xl border border-line bg-canvas">
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-navy-900">
                        {item.trade} · {t("people", { count: item.quantity })}
                        {item.as_brigade ? ` · ${t("asBrigade")}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {[
                          item.location,
                          item.start_date,
                          item.duration_months ? t("months", { count: item.duration_months }) : null,
                          item.salary_from || item.salary_to ? `${money(item.salary_from)}–${money(item.salary_to)} so'm` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-primary">
                      {t.has(`status.${item.status}` as "status.NEW") ? t(`status.${item.status}` as "status.NEW") : item.status}
                    </span>
                    <span className="text-xs font-semibold text-muted">{t("candidatesCount", { count: item.candidates })}</span>
                    <button
                      type="button"
                      onClick={() => void loadMatches(item.id)}
                      aria-expanded={open === item.id}
                      className="min-h-9 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover"
                    >
                      {open === item.id ? t("hideMatches") : t("showMatches")}
                    </button>
                  </div>
                  {open === item.id && data ? (
                    <div className="grid gap-4 border-t border-line p-4 lg:grid-cols-2">
                      <div>
                        <h3 className="mb-2 text-sm font-bold text-navy-900">{t("brigades")}</h3>
                        {data.brigades.length === 0 ? <p className="text-sm text-muted">{t("noMatches")}</p> : null}
                        <ul className="flex flex-col gap-2">
                          {data.brigades.map((brigade) => (
                            <li key={brigade.id} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
                              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-100 text-success-600">
                                <Icon name="users" className="size-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-navy-900">{brigade.name}</span>
                                <span className="text-xs text-muted">
                                  {t("members", { count: brigade.members })}
                                  {brigade.rating ? ` · ★ ${brigade.rating}` : ""}
                                  {brigade.fits ? ` · ${t("fits")}` : ""}
                                </span>
                              </span>
                              <button type="button" onClick={() => void propose(item.id, { brigade_id: brigade.id })} className="min-h-9 rounded-xl bg-blue-100 px-3 text-xs font-bold text-primary hover:bg-primary hover:text-white">
                                {t("propose")}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="mb-2 text-sm font-bold text-navy-900">{t("workers")}</h3>
                        {data.workers.length === 0 ? <p className="text-sm text-muted">{t("noMatches")}</p> : null}
                        <ul className="flex flex-col gap-2">
                          {data.workers.map((worker) => (
                            <li key={worker.user_id} className="flex items-center gap-3 rounded-xl border border-line bg-card p-3">
                              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-extrabold tabular-nums text-primary" title={t("match")}>
                                {Math.round(worker.score * 100)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <Link href={`/ustalar/${worker.slug}`} className="block truncate font-semibold text-navy-900 hover:text-primary">
                                  {worker.name}
                                </Link>
                                <span className="mt-0.5 flex flex-wrap gap-1" aria-label={t("why")}>
                                  {worker.reasons.map((reason) => (
                                    <span key={reason} className="rounded-full bg-surface-100 px-2 py-0.5 text-[11px] font-semibold text-muted">
                                      {t(`reason.${reason}` as "reason.certified")}
                                    </span>
                                  ))}
                                  {!worker.reasons.includes("available") ? (
                                    <span className="rounded-full bg-warning-100 px-2 py-0.5 text-[11px] font-semibold text-warning-600">
                                      {workerT(`status.${worker.availability}` as "status.BUSY")}
                                    </span>
                                  ) : null}
      {employer ? (
        <details open={requests.length === 0} className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-hover [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="transition group-open:rotate-45">+</span>
            {t("newRequest")}
          </summary>
        <form onSubmit={sendRequest} className={`${CARD} mt-3 grid gap-4 md:grid-cols-4`}>
          <div className="md:col-span-4">
            <h2 className="text-xl font-bold text-navy-900">{t("newRequest")}</h2>
            <p className="mt-1 text-sm text-muted">{employer.verified ? t("newRequestText") : t("needVerify")}</p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
            {t("trade")}
            <select name="trade" required className={FIELD}>
              {trades.map((trade) => (
                <option key={trade.code} value={trade.code}>
                  {trade.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("quantity")}
            <input name="quantity" type="number" min={1} max={500} defaultValue={1} required className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("track")}
            <select name="track" className={FIELD} defaultValue="DOMESTIC">
              <option value="DOMESTIC">{t("trackDomestic")}</option>
              <option value="FOREIGN">{t("trackForeign")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
            {t("location")}
            <input name="location" defaultValue="Uychi" maxLength={200} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("startDate")}
            <input name="start_date" type="date" className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
            {t("duration")}
            <input name="duration" type="number" min={1} max={60} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
            {t("salaryFrom")}
            <input name="salary_from" type="number" min={0} step={100000} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-2">
            {t("salaryTo")}
            <input name="salary_to" type="number" min={0} step={100000} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900 md:col-span-4">
            {t("conditions")}
            <textarea name="conditions" maxLength={2000} rows={2} className={`${FIELD} py-2.5`} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-navy-900 md:col-span-2">
            <input name="as_brigade" type="checkbox" className="size-4 accent-primary" />
            {t("asBrigade")}
          </label>
          <div className="md:col-span-2 md:text-right">
            <button
              type="submit"
              disabled={!employer.verified}
              className="min-h-11 w-full rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 md:w-auto"
            >
              {t("send")}
            </button>
          </div>
        </form>
        </details>
      ) : null}
                                </span>
                              </span>
                              <button type="button" onClick={() => void propose(item.id, { worker_user_id: worker.user_id })} className="min-h-9 rounded-xl bg-blue-100 px-3 text-xs font-bold text-primary hover:bg-primary hover:text-white">
                                {t("propose")}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {list.length > 0 ? (
                        <div className="lg:col-span-2">
                          <h3 className="mb-2 text-sm font-bold text-navy-900">{t("candidates")}</h3>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {list.map((candidate) => {
                              const stage =
                                candidate.status === "HIRED" ? 3 : candidate.status === "EMPLOYER_APPROVED" ? 2 : candidate.status === "PROPOSED" ? 0 : 1;
                              const bad = candidate.status === "WORKER_DECLINED" || candidate.status === "EMPLOYER_REJECTED";
                              const steps = ["sent", "answer", "approved", "hired"] as const;
                              return (
                                <li key={candidate.id} className="rounded-xl border border-line bg-surface-100 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-bold text-navy-900">
                                      <Icon name={candidate.kind === "brigade" ? "users" : "user"} className="size-3.5 shrink-0" />
                                      <span className="truncate">{candidate.name}</span>
                                    </span>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${bad ? "bg-danger-100 text-danger-600" : stage === 3 ? "bg-success-100 text-success-600" : "bg-blue-100 text-primary"}`}>
                                      {t(`cand.${candidate.status}` as "cand.PROPOSED")}
                                    </span>
                                  </div>
                                  <ol className="mt-3 flex items-center" aria-label={t(`cand.${candidate.status}` as "cand.PROPOSED")}>
                                    {steps.map((step, index) => (
                                      <li key={step} className="flex flex-1 items-center last:flex-none">
                                        <span
                                          title={t(`step.${step}`)}
                                          className={`size-3 shrink-0 rounded-full ${index <= stage ? (bad && index === stage ? "bg-danger-600" : "bg-primary") : "bg-line-strong"}`}
                                        />
                                        {index < steps.length - 1 ? <span className={`h-0.5 flex-1 ${index < stage ? "bg-primary" : "bg-line-strong"}`} /> : null}
                                      </li>
                                    ))}
                                  </ol>
                                  <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-muted">
                                    {steps.map((step) => (
                                      <span key={step}>{t(`step.${step}`)}</span>
                                    ))}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                      <p className="text-xs text-muted lg:col-span-2">{t("privacy")}</p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {placements.length > 0 ? (
        <section className={CARD}>
          <h2 className="text-xl font-bold text-navy-900">{t("reviewTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("reviewText")}</p>
          <ul className="mt-4 flex flex-col gap-3">
            {placements.map((item) => (
              <li key={item.id}>
                <form onSubmit={(event) => void review(event, item.id)} className="grid gap-3 rounded-xl border border-line bg-canvas p-4 md:grid-cols-6 md:items-end">
                  <p className="font-bold text-navy-900 md:col-span-6">{item.name}</p>
                  {SCORES.map((key) => (
                    <label key={key} className="flex flex-col gap-1 text-xs font-semibold text-muted">
                      {workerT(`crit.${key}`)}
                      <select name={key} defaultValue={5} className={FIELD}>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {"★".repeat(n)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <label className="flex flex-col gap-1 text-xs font-semibold text-muted md:col-span-2">
                    {t("comment")}
                    <input name="comment" maxLength={500} className={FIELD} />
                  </label>
                  <div className="md:col-span-6 md:text-right">
                    <button type="submit" className="min-h-10 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover">
                      {t("saveReview")}
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className={CARD}>
          <h2 className="text-xl font-bold text-navy-900">{t("pendingCompanies")}</h2>
          <ul className="mt-3 divide-y divide-line">
            {pending.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 py-3">
                <span className="text-sm">
                  <span className="font-semibold text-navy-900">{item.name}</span> · {item.inn}
                </span>
                <button
                  type="button"
                  onClick={() => void post(`/api/v1/admin/employers/${item.id}/verify`).then(() => load())}
                  className="min-h-9 rounded-xl bg-success-600 px-4 text-sm font-bold text-white hover:bg-teal-700"
                >
                  {t("verify")}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
