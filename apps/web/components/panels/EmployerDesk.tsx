"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD, Meter, Tile, type Tone } from "@/components/cabinet/kit";
import { send } from "@/lib/clientApi";

type Desk = {
  company: { name: string; verified: boolean; completeness: number };
  kpi: { open_requests: number; open_places: number; in_pipeline: number; interviews: number; active_placements: number; rating: number | null; reviews: number; response_hours: number | null };
  stages: string[];
  counts: Record<string, number>;
  pipeline: { id: string; request_id: string; trade: string; stage: string; stage_note: string | null; at: string | null; is_worker: boolean; name: string; slug: string | null }[];
  placements: { id: string; name: string; slug: string | null; start: string; finish: string | null; salary: number | null; reviewed: boolean }[];
};

const STAGE_TONE: Record<string, Tone> = { SHORTLISTED: "gray", INTERVIEW: "blue", OFFER: "amber", HIRED: "green", REJECTED: "red" };
const NEXT: Record<string, string[]> = {
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFER", "REJECTED"],
  OFFER: ["HIRED", "REJECTED"],
  REJECTED: ["SHORTLISTED"],
  HIRED: [],
};

export function EmployerDesk() {
  const t = useTranslations("ed");
  const [data, setData] = useState<Desk | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const result = await send<Desk>("/api/v1/employers/desk", "GET");
    if (result.ok && result.data) setData(result.data);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  async function move(id: string, stage: string) {
    const result = await send(`/api/v1/employers/candidates/${id}/stage`, "POST", { stage });
    setNote(result.ok ? { ok: true, text: t("moved") } : { ok: false, text: t("failed") });
    await load();
  }

  async function end(id: string) {
    const result = await send(`/api/v1/employers/placements/${id}/end`, "POST", {});
    setNote(result.ok ? { ok: true, text: t("moved") } : { ok: false, text: t("failed") });
    await load();
  }

  const k = data.kpi;
  const shown = data.pipeline.filter((item) => !filter || item.stage === filter);

  return (
    <div className="flex flex-col gap-6">
      {data.company.verified ? null : <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-navy-900">{t("unverified")}</p>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Tile label={t("kpi.open_requests")} value={k.open_requests} tone="blue" />
        <Tile label={t("kpi.open_places")} value={k.open_places} tone="amber" />
        <Tile label={t("kpi.in_pipeline")} value={k.in_pipeline} tone="blue" hint={`${t("stage.INTERVIEW")}: ${k.interviews}`} />
        <Tile label={t("kpi.active_placements")} value={k.active_placements} tone="green" />
        <Tile label={t("kpi.rating")} value={k.rating === null ? "—" : k.rating} tone="green" />
        <Tile label={t("kpi.response_hours")} value={k.response_hours === null ? "—" : k.response_hours} tone="gray" />
        <div className={`${CARD} col-span-2 flex flex-col justify-between gap-2`}>
          <p className="text-sm font-semibold text-muted">{t("complete", { n: data.company.completeness })}</p>
          <Meter value={data.company.completeness} tone={data.company.completeness >= 70 ? "green" : "amber"} label={t("complete", { n: data.company.completeness })} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">{t("completeHint")}</p>
            <Link href="/kabinet/kompaniya" className={buttonClass({ variant: "secondary" })}>{t("fill")}</Link>
          </div>
        </div>
      </div>

      <section aria-labelledby="ed-pipe" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="ed-pipe" className="text-xl font-extrabold text-navy-900">{t("pipeline")}</h2>
          <div className="flex flex-wrap gap-2">
            {["", ...data.stages].map((stage) => (
              <button
                key={stage || "all"}
                type="button"
                aria-pressed={filter === stage}
                onClick={() => setFilter(stage)}
                className={`rounded-full border px-3 py-1.5 text-sm font-bold ${filter === stage ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
              >
                {stage ? `${t(`stage.${stage}` as "stage.HIRED")} · ${data.counts[stage] ?? 0}` : `${data.pipeline.length}`}
              </button>
            ))}
          </div>
        </div>
        {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}
        {shown.length === 0 ? (
          <EmptyState title={t("noCandidates")} text="" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {shown.map((item) => (
              <li key={item.id} className={`${CARD} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    {item.slug ? <Link href={`/ustalar/${item.slug}`} className="block truncate font-bold text-navy-900 hover:text-primary">{item.name}</Link> : <p className="truncate font-bold text-navy-900">{item.is_worker ? item.name : `${t("brigade")}: ${item.name}`}</p>}
                    <p className="text-sm text-muted">{item.trade}{item.at ? ` · ${item.at}` : ""}</p>
                  </div>
                  <Badge tone={STAGE_TONE[item.stage] ?? "gray"}>{t(`stage.${item.stage}` as "stage.HIRED")}</Badge>
                </div>
                {item.stage_note ? <p className="text-sm text-muted">{item.stage_note}</p> : null}
                {(NEXT[item.stage] ?? []).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted">{t("moveTo")}:</span>
                    {(NEXT[item.stage] ?? []).map((stage) => (
                      <button key={stage} type="button" className={buttonClass({ variant: stage === "REJECTED" ? "secondary" : "primary" })} onClick={() => void move(item.id, stage)}>
                        {t(`stage.${stage}` as "stage.HIRED")}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link href="/kabinet/ishberuvchi" className={`${buttonClass({ variant: "secondary" })} w-fit`}>{t("requests")} →</Link>
      </section>

      <section aria-labelledby="ed-staff" className="flex flex-col gap-3">
        <h2 id="ed-staff" className="text-xl font-extrabold text-navy-900">{t("placements")}</h2>
        {data.placements.length === 0 ? (
          <EmptyState title={t("noPlacements")} text="" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.placements.map((p) => (
              <li key={p.id} className={`${CARD} flex flex-wrap items-center justify-between gap-3`}>
                <div className="min-w-0">
                  {p.slug ? <Link href={`/ustalar/${p.slug}`} className="block truncate font-bold text-navy-900 hover:text-primary">{p.name}</Link> : <p className="truncate font-bold text-navy-900">{p.name}</p>}
                  <p className="text-sm text-muted">{t("since", { day: p.start })}{p.finish ? ` · ${t("until", { day: p.finish })}` : ""}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.finish ? <Badge tone="gray">{t("ended")}</Badge> : null}
                    {p.reviewed ? <Badge tone="green">{t("reviewed")}</Badge> : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.reviewed ? null : <Link href="/kabinet/ishberuvchi" className={buttonClass({ variant: "secondary" })}>{t("review")}</Link>}
                  {p.finish ? null : <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void end(p.id)}>{t("endPlacement")}</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
