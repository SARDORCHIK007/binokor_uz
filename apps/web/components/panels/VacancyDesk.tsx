"use client";

import { Button, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, CARD, initials, type Tone } from "@/components/cabinet/kit";
import { Flag } from "@/components/Flag";
import { CandidatePool, FitChips, type PoolPerson } from "@/components/panels/CandidatePool";
import type { VacancyItem } from "@/components/panels/VacancyWorkspace";
import { FIELD, send } from "@/lib/clientApi";

type Candidate = PoolPerson & { id: string; status: string; stage: string; note: string | null; stage_at: string | null };
export type DeskData = {
  vacancy: VacancyItem & { employer: string };
  firm: { id: string; name: string; country: string; verified: boolean; legal_name: string; registration_no: string; address: string; website: string; contact_person: string; contact_email: string; contact_phone: string };
  candidates: Candidate[];
  stages: string[];
};

const STAGE_TONE: Record<string, Tone> = { SHORTLISTED: "gray", DOCS: "blue", LANGUAGE: "blue", INTERVIEW: "amber", OFFER: "amber", VISA: "amber", DEPARTED: "green", REJECTED: "red" };
const LOCKED = new Set(["OFFER", "VISA", "DEPARTED"]);

export function VacancyDesk({ initial, pool }: { initial: DeskData; pool: Parameters<typeof CandidatePool>[0]["initial"] }) {
  const t = useTranslations("ag");
  const vw = useTranslations("vw");
  const countries = useTranslations("countries");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { vacancy, firm } = data;
  const req = vacancy.requirements;
  const countryName = (code: string) => (countries.has(code as "KR") ? countries(code as "KR") : code);

  async function reload() {
    const fresh = await send<DeskData>(`/api/v1/migration/vacancies/${vacancy.id}?lang=${locale}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function setStage(candidate: Candidate, stage: string) {
    setNote(null);
    const result = await send(`/api/v1/migration/candidates/${candidate.id}/stage`, "POST", { stage, note: notes[candidate.id] ?? candidate.note ?? "" });
    setNote(result.ok ? { ok: true, text: t("desk.saved") } : { ok: false, text: result.status === 409 ? t("desk.locked") : t("desk.failed") });
    await reload();
  }

  async function remove(candidate: Candidate) {
    const result = await send(`/api/v1/migration/candidates/${candidate.id}`, "DELETE");
    if (!result.ok) setNote({ ok: false, text: t("desk.cannotRemove") });
    await reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className={CARD} aria-labelledby="vac">
          <div className="flex items-start gap-3">
            <Flag code={vacancy.country} className="size-10" />
            <div className="min-w-0">
              <h2 id="vac" className="text-xl font-extrabold text-navy-900">{vacancy.title || vacancy.trade}</h2>
              <p className="text-sm text-muted">
                {vacancy.trade} · {countryName(vacancy.country)}
              </p>
            </div>
          </div>
          <p className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="blue">{vw("places", { n: vacancy.quantity })}</Badge>
            {vacancy.deadline ? <Badge tone="amber">{vw("deadline", { date: vacancy.deadline })}</Badge> : null}
            {vacancy.months ? <Badge tone="gray">{vacancy.months} oy</Badge> : null}
            {vacancy.schedule ? <Badge tone="gray">{vacancy.schedule}</Badge> : null}
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">{t("desk.requirements")}</h3>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {req.min_level ? <Badge tone="gray">{vw("reqLevel", { level: vw(`level.${req.min_level}` as "level.MASTER") })}</Badge> : null}
                {req.min_experience_years ? <Badge tone="gray">{vw("reqYears", { n: req.min_experience_years })}</Badge> : null}
                {req.certificate_required ? <Badge tone="gray">{vw("reqCertificate")}</Badge> : null}
                {req.language ? <Badge tone="gray">{vw("reqLanguage", { lang: vw.has(`lang.${req.language}` as "lang.ru") ? vw(`lang.${req.language}` as "lang.ru") : req.language, level: req.language_level ?? 0 })}</Badge> : null}
              </p>
              {req.notes ? <p className="mt-2 text-sm text-body">{req.notes}</p> : null}
            </div>
            <div>
              <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">{t("desk.offer")}</h3>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(vacancy.benefits).filter(([, on]) => on).map(([key]) => (
                  <Badge key={key} tone="green">{vw(`benefit.${key}` as "benefit.housing")}</Badge>
                ))}
              </p>
              {vacancy.conditions ? <p className="mt-2 text-sm text-body">{vacancy.conditions}</p> : null}
            </div>
          </div>
          {vacancy.duties ? (
            <div className="mt-5">
              <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">{t("desk.duties")}</h3>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-body">{vacancy.duties}</p>
            </div>
          ) : null}
          <div className="mt-5">
            <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">{t("desk.where")}</h3>
            <p className="mt-2 text-sm text-navy-900">
              {[vacancy.city, vacancy.address].filter(Boolean).join(", ") || "—"}
              {vacancy.map_url ? (
                <>
                  {" · "}
                  <a href={vacancy.map_url} target="_blank" rel="noopener noreferrer nofollow" className="font-bold text-primary hover:underline">
                    {t("desk.map")}
                  </a>
                </>
              ) : null}
            </p>
          </div>
        </section>

        <section className={CARD} aria-labelledby="firm">
          <h2 id="firm" className="text-lg font-extrabold text-navy-900">{t("desk.firm")}</h2>
          <p className="mt-2 font-bold text-navy-900">{firm.legal_name || firm.name}</p>
          <p className="mt-1">
            <Badge tone={firm.verified ? "green" : "amber"}>{firm.verified ? t("desk.firmVerified") : t("firms.unverified")}</Badge>
          </p>
          {!firm.verified ? <p className="mt-2 text-sm text-warning-600">{t("desk.firmUnverified")}</p> : null}
          <dl className="mt-3 grid gap-2 text-sm">
            {([["firms.reg", firm.registration_no], ["firms.contact", firm.contact_person], ["", firm.contact_email], ["", firm.contact_phone], ["", firm.address], ["", firm.website]] as const)
              .filter(([, value]) => value)
              .map(([key, value]) => (
                <div key={`${key}${value}`} className="flex gap-2">
                  {key ? <dt className="text-muted">{t(key as "firms.reg")}:</dt> : null}
                  <dd className="min-w-0 font-semibold break-words text-navy-900">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      </div>

      <section aria-labelledby="pipe" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="pipe" className="text-xl font-extrabold text-navy-900">{t("desk.pipeline")}</h2>
          <Button type="button" onClick={() => setAdding((value) => !value)}>
            {adding ? "×" : "+"} {t("desk.add")}
          </Button>
        </div>
        {note ? (
          <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
            {note.ok ? "✓ " : ""}
            {note.text}
          </p>
        ) : null}
        {adding ? (
          <div className="rounded-2xl border border-line bg-surface-100 p-4">
            <p className="mb-3 text-sm text-muted">{t("desk.addText")}</p>
            <CandidatePool initial={pool} openVacancies={[]} fixedVacancy={vacancy.id} onAdded={() => void reload()} />
          </div>
        ) : null}
        {data.candidates.length === 0 ? (
          <EmptyState title={t("desk.noCandidates")} text="" />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.candidates.map((candidate) => (
              <li key={candidate.id} className={`${CARD} flex flex-col gap-3`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-sm font-bold text-primary" aria-hidden="true">
                      {initials(candidate.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-navy-900">{candidate.name}</p>
                      <p className="text-sm text-muted">{candidate.trade} · {t("pool.hours", { n: candidate.hours })}</p>
                      <div className="mt-1.5">
                        <FitChips person={candidate} />
                      </div>
                    </div>
                  </div>
                  <Badge tone={STAGE_TONE[candidate.stage] ?? "gray"}>{t(`stage.${candidate.stage}` as "stage.DOCS")}</Badge>
                </div>
                <ol className="flex items-center" aria-label={t("desk.stage")}>
                  {data.stages.filter((stage) => stage !== "REJECTED").map((stage, index, list) => {
                    const current = data.stages.indexOf(candidate.stage);
                    const reached = candidate.stage !== "REJECTED" && data.stages.indexOf(stage) <= current;
                    return (
                      <li key={stage} className="flex flex-1 items-center last:flex-none">
                        <span title={t(`stage.${stage}` as "stage.DOCS")} className={`size-3 shrink-0 rounded-full ${reached ? "bg-primary" : "bg-line-strong"}`} />
                        {index < list.length - 1 ? <span className={`h-0.5 flex-1 ${reached && data.stages.indexOf(stage) < current ? "bg-primary" : "bg-line-strong"}`} /> : null}
                      </li>
                    );
                  })}
                </ol>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                    {t("desk.stage")}
                    <select value={candidate.stage} onChange={(event) => void setStage(candidate, event.target.value)} className={`${FIELD} !min-h-10 w-auto text-sm`}>
                      {data.stages.map((stage) => (
                        <option key={stage} value={stage} disabled={!firm.verified && LOCKED.has(stage)}>
                          {t(`stage.${stage}` as "stage.DOCS")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-muted">
                    {t("desk.note")}
                    <input
                      value={notes[candidate.id] ?? candidate.note ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [candidate.id]: event.target.value }))}
                      onBlur={() => (notes[candidate.id] ?? candidate.note ?? "") !== (candidate.note ?? "") && void setStage(candidate, candidate.stage)}
                      maxLength={500}
                      className={`${FIELD} !min-h-10 text-sm`}
                    />
                  </label>
                  {candidate.stage === "SHORTLISTED" || candidate.stage === "REJECTED" ? (
                    <button type="button" className="rounded-xl border border-line-strong px-3 py-2 text-sm font-bold text-navy-900 hover:border-danger-600 hover:text-danger-600" onClick={() => void remove(candidate)}>
                      {t("desk.remove")}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
