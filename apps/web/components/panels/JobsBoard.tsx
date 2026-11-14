"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Tile, type Tone } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Board = {
  employers: { id: string; name: string; kind: string; inn: string | null }[];
  requests: { id: string; employer: string; quantity: number; status: string; as_brigade: boolean; track: string; place: string | null; trade: string; created: string; candidates: number }[];
  brigades: { id: string; name: string; status: string; members: number }[];
  placements: { id: string; full_name: string; employer: string; kind: string; start: string; finish: string | null; review: { quality: number; discipline: number; safety: number; communication: number } | null }[];
};

const FLOW = ["NEW", "IN_REVIEW", "SHORTLIST_SENT", "EMPLOYER_APPROVED", "MATCHED", "CLOSED"] as const;
const NEXT: Record<string, string> = { NEW: "IN_REVIEW", IN_REVIEW: "SHORTLIST_SENT", SHORTLIST_SENT: "EMPLOYER_APPROVED", EMPLOYER_APPROVED: "MATCHED", MATCHED: "CLOSED" };
const TONE: Record<string, Tone> = { NEW: "blue", IN_REVIEW: "amber", VIA_AGENCY: "amber", SHORTLIST_SENT: "amber", EMPLOYER_APPROVED: "green", CONTRACTING: "green", MATCHED: "green", CLOSED: "gray", CANCELLED: "gray" };
const SCORES = ["quality", "discipline", "safety", "communication"] as const;
const TABS = ["requests", "placements", "brigades", "employers"] as const;

export function JobsBoard() {
  const t = useTranslations("jb");
  const [data, setData] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("requests");
  const [filter, setFilter] = useState("");
  const [rating, setRating] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({ quality: 5, discipline: 5, safety: 5, communication: 5 });
  const [comment, setComment] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const result = await send<Board>("/api/v1/jobs/board", "GET");
    if (result.ok && result.data) setData(result.data);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  const report = (ok: boolean) => setNote({ ok, text: ok ? t("saved") : t("failed") });

  async function move(id: string, status: string) {
    report((await send(`/api/v1/jobs/requests/${id}/transition`, "POST", { status })).ok);
    await load();
  }

  async function saveReview(id: string) {
    const result = await send(`/api/v1/jobs/placements/${id}/review`, "POST", { ...scores, comment });
    report(result.ok);
    if (result.ok) {
      setRating(null);
      setComment("");
      await load();
    }
  }

  const open = data.requests.filter((r) => !["CLOSED", "CANCELLED", "MATCHED"].includes(r.status));
  const counts: Record<(typeof TABS)[number], number> = { requests: data.requests.length, placements: data.placements.length, brigades: data.brigades.length, employers: data.employers.length };
  const shown = data.requests.filter((r) => !filter || r.status === filter);
  const statusCount = (status: string) => data.requests.filter((r) => r.status === status).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={t("tab.requests")} value={open.length} tone="blue" />
        <Tile label={t("tab.placements")} value={data.placements.length} tone="green" />
        <Tile label={t("tab.brigades")} value={data.brigades.length} tone="amber" />
        <Tile label={t("tab.employers")} value={data.employers.length} tone="gray" />
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full border px-4 py-2 text-sm font-bold ${tab === key ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}>
            {t(`tab.${key}`)} · {counts[key]}
          </button>
        ))}
      </div>
      {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}

      {tab === "requests" ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {["", ...FLOW].map((status) => (
              <button key={status || "all"} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)} className={`rounded-full border px-3 py-1 text-xs font-bold ${filter === status ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900"}`}>
                {status ? `${t(`s.${status}` as "s.NEW")} · ${statusCount(status)}` : data.requests.length}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <EmptyState title={t("noRequests")} text={t("noRequestsText")} />
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {shown.map((item) => (
                <li key={item.id} className={`${CARD} flex flex-col gap-3`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-navy-900">{item.employer}</p>
                      <p className="text-sm text-muted">{item.trade}{item.place ? ` · ${item.place}` : ""} · {item.created}</p>
                    </div>
                    <Badge tone={TONE[item.status] ?? "gray"}>{t(`s.${item.status}` as "s.NEW")}</Badge>
                  </div>
                  <p className="flex flex-wrap gap-1.5">
                    <Badge tone="blue">{t("places", { n: item.quantity })}</Badge>
                    <Badge tone={item.candidates > 0 ? "green" : "gray"}>{t("candidates", { n: item.candidates })}</Badge>
                    <Badge tone="gray">{item.as_brigade ? t("brigade") : t("individual")}</Badge>
                    <Badge tone={item.track === "FOREIGN" ? "amber" : "gray"}>{item.track === "FOREIGN" ? t("foreign") : t("domestic")}</Badge>
                  </p>
                  {NEXT[item.status] ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted">{t("moveTo")}:</span>
                      <button type="button" className={buttonClass()} onClick={() => void move(item.id, NEXT[item.status] as string)}>{t(`s.${NEXT[item.status]}` as "s.NEW")}</button>
                      <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void move(item.id, "CANCELLED")}>{t("cancel")}</button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "placements" ? (
        data.placements.length === 0 ? (
          <EmptyState title={t("noPlacements")} text={t("noPlacementsText")} />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.placements.map((item) => (
              <li key={item.id} className={`${CARD} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">{item.full_name}</p>
                    <p className="text-sm text-muted">{item.employer} · {t(`kind.${item.kind}` as "kind.DIRECT")}</p>
                    <p className="text-xs text-muted">{t("since", { day: item.start })}{item.finish ? ` · ${t("until", { day: item.finish })}` : ""}</p>
                  </div>
                  {item.review ? <Badge tone="green">{t("reviewed")}</Badge> : null}
                </div>
                {item.review ? (
                  <p className="flex flex-wrap gap-1.5 text-xs">
                    {SCORES.map((key) => <Badge key={key} tone="gray">{t(`q.${key}`)} {item.review?.[key]}</Badge>)}
                  </p>
                ) : rating === item.id ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SCORES.map((key) => (
                        <label key={key} className="flex flex-col gap-1 text-xs font-semibold text-muted">
                          {t(`q.${key}`)}: {scores[key]}
                          <input type="range" min="1" max="5" value={scores[key]} className="accent-[var(--primary)]" onChange={(event) => setScores({ ...scores, [key]: Number(event.target.value) })} />
                        </label>
                      ))}
                    </div>
                    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                      {t("comment")}
                      <input className={FIELD} value={comment} onChange={(event) => setComment(event.target.value)} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={buttonClass()} onClick={() => void saveReview(item.id)}>{t("saveReview")}</button>
                      <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setRating(null)}>{t("cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className={`${buttonClass({ variant: "secondary" })} w-fit`} onClick={() => setRating(item.id)}>{t("review")}</button>
                )}
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "brigades" ? (
        data.brigades.length === 0 ? (
          <EmptyState title={t("noBrigades")} text={t("noBrigadesText")} />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-3">
            {data.brigades.map((item) => (
              <li key={item.id} className={CARD}>
                <p className="font-bold text-navy-900">{item.name}</p>
                <p className="mt-1 flex flex-wrap gap-1.5"><Badge tone="blue">{t("members", { n: item.members })}</Badge><Badge tone="gray">{item.status}</Badge></p>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "employers" ? (
        data.employers.length === 0 ? (
          <EmptyState title={t("noEmployers")} text={t("noEmployersText")} />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-3">
            {data.employers.map((item) => (
              <li key={item.id} className={CARD}>
                <p className="font-bold text-navy-900">{item.name}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="gray">{t(`kind.${item.kind === "FOREIGN" ? "FOREIGN" : "LOCAL"}` as "kind.LOCAL")}</Badge>
                  {item.inn ? <Badge tone="blue">{t("inn", { inn: item.inn })}</Badge> : null}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
