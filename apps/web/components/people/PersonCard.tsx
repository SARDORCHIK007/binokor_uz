"use client";

import { Button } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { Badge, CARD, Meter, Tile, type Tone } from "@/components/cabinet/kit";
import { Flag } from "@/components/Flag";
import { FIELD, send } from "@/lib/clientApi";

export type CardData = {
  person: { id: string; name: string; birth: string; mahalla: string; university: string | null; graduation_year: number | null };
  applications: { id: string; status: string; source: string; type: string; track: string; created: string; matrix: string | null; trade: string }[];
  teams: string[];
  sections: string[];
  education?: {
    enrollment: { group: string; mentor: string; status: string; since: string } | null;
    lessons?: number;
    attendance?: number | null;
    site_hours?: number;
    graded?: number;
    passed?: number;
    score?: number | null;
    certificates: { number: string; status: string; issued: string | null }[];
  };
  work?: {
    profile: { slug: string; level: string; availability: string; hours: number; rating: number | null } | null;
    placements: { name: string; kind: string; start: string; finish: string | null }[];
    languages: { code: string; level: number }[];
    candidacies: { vacancy_id: string; title: string; track: string; country: string; employer: string; stage: string; status: string; stage_note: string | null }[];
  };
  payments?: { period: string; amount: number; status: string; reason: string | null }[];
  notes: { id: string; team: string; text: string; shared: boolean; at: string; by: string | null }[];
  tasks: { id: string; team: string; title: string; due: string | null; from: string | null; done: boolean }[];
};

const TEAMS = ["employment", "agency", "mahalla", "education", "admin"] as const;
const LEVEL = ["", "A1", "A2", "B1", "B2", "C1", "C2"];
const STAGE_TONE: Record<string, Tone> = { SHORTLISTED: "gray", DOCS: "blue", LANGUAGE: "blue", INTERVIEW: "amber", OFFER: "amber", VISA: "amber", DEPARTED: "green", REJECTED: "red" };

export function PersonCard({ initial }: { initial: CardData }) {
  const t = useTranslations("pc");
  const adm = useTranslations("adm");
  const ag = useTranslations("ag");
  const pay = useTranslations("pay");
  const vw = useTranslations("vw");
  const wp = useTranslations("workerProfile");
  const countries = useTranslations("countries");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function reload() {
    const fresh = await send<CardData>(`/api/v1/people/${data.person.id}?lang=${locale}`, "GET");
    if (fresh.ok && fresh.data) setData(fresh.data);
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setNote("");
    const result = await send(`/api/v1/people/${data.person.id}/notes`, "POST", { body: form.get("body"), shared: form.get("shared") === "on" });
    setBusy(false);
    if (result.ok) {
      formElement.reset();
      await reload();
    } else {
      setNote(t("failed"));
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setNote("");
    const result = await send(`/api/v1/people/${data.person.id}/tasks`, "POST", { team: form.get("team"), title: form.get("title"), due: form.get("due") || null });
    setBusy(false);
    if (result.ok) {
      formElement.reset();
      await reload();
    } else {
      setNote(t("failed"));
    }
  }

  async function finish(id: string) {
    await send(`/api/v1/people/tasks/${id}/done`, "POST");
    await reload();
  }

  const { person } = data;
  const has = (section: string) => data.sections.includes(section);
  const teamName = (key: string) => t(`team.${key}` as "team.admin");
  const edu = data.education;
  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  const money = (value: number) => value.toLocaleString("ru-RU");

  return (
    <div className="flex flex-col gap-6">
      <section className={`${CARD} flex flex-wrap items-center justify-between gap-4`}>
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-navy-900">{person.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("born")}: {person.birth} · {t("mahalla")}: {person.mahalla || "—"}
            {person.university ? ` · ${t("university")}: ${person.university}${person.graduation_year ? ` (${person.graduation_year})` : ""}` : ""}
          </p>
        </div>
        <p className="flex flex-wrap gap-1.5">
          {data.teams.map((team) => (
            <Badge key={team} tone="blue">{teamName(team)}</Badge>
          ))}
        </p>
      </section>

      <section className={CARD} aria-labelledby="apps">
        <h3 id="apps" className="text-lg font-extrabold text-navy-900">{t("applications")}</h3>
        {data.applications.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("noApplications")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {data.applications.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block font-bold text-navy-900">{app.trade}</span>
                  <span className="text-xs text-muted">{adm(`appType.${app.type}` as "appType.YOUTH")} · {app.created}{app.matrix ? ` · ${adm("apps.class", { c: app.matrix })}` : ""}</span>
                </span>
                <Badge tone="blue">{adm(`appStatus.${app.status}` as "appStatus.DRAFT")}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {has("education") && edu ? (
        <section className={CARD} aria-labelledby="edu">
          <h3 id="edu" className="text-lg font-extrabold text-navy-900">{t("education")}</h3>
          {edu.enrollment ? (
            <>
              <p className="mt-2 text-sm text-muted">{t("group", { code: edu.enrollment.group, mentor: edu.enrollment.mentor })} · {edu.enrollment.since}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile label={t("attendance")} value={edu.attendance === null || edu.attendance === undefined ? "—" : `${edu.attendance}%`} tone={edu.attendance !== null && edu.attendance !== undefined && edu.attendance < 80 ? "red" : "green"} />
                <Tile label={t("score")} value={edu.score ?? "—"} tone="blue" />
                <Tile label={t("modules")} value={`${edu.passed ?? 0}/${edu.graded ?? 0}`} tone="blue" />
                <Tile label={t("hours")} value={edu.site_hours ?? 0} tone="amber" />
              </div>
              {edu.attendance !== null && edu.attendance !== undefined ? (
                <div className="mt-3"><Meter value={edu.attendance} tone={edu.attendance < 80 ? "red" : "green"} label={t("attendance")} /></div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">{t("notEnrolled")}</p>
          )}
          <h4 className="mt-5 text-sm font-bold text-navy-900">{t("certificates")}</h4>
          {edu.certificates.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("noCertificates")}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2">
              {edu.certificates.map((cert) => (
                <li key={cert.number}>
                  <a href={`/verify/${cert.number}`} className="inline-flex items-center gap-2 rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-600 hover:underline">
                    {cert.number}
                    {cert.issued ? <span className="font-medium">· {cert.issued}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {has("work") && data.work ? (
        <section className={CARD} aria-labelledby="work">
          <h3 id="work" className="text-lg font-extrabold text-navy-900">{t("work")}</h3>
          <div className="mt-3 grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-bold text-navy-900">{t("profile")}</h4>
              {data.work.profile ? (
                <p className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="blue">{wp(`levels.${data.work.profile.level}` as "levels.MASTER")}</Badge>
                  <Badge tone={data.work.profile.availability === "FREE" ? "green" : "gray"}>{wp(`availabilities.${data.work.profile.availability}` as "availabilities.FREE")}</Badge>
                  <Badge tone="gray">{data.work.profile.hours} h</Badge>
                  {data.work.profile.rating !== null ? <Badge tone="amber">★ {data.work.profile.rating.toFixed(1)}</Badge> : null}
                  <a href={`/ustalar/${data.work.profile.slug}`} className="text-xs font-bold text-primary hover:underline">{t("open")} →</a>
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">{t("noProfile")}</p>
              )}
              <h4 className="mt-4 text-sm font-bold text-navy-900">{t("languages")}</h4>
              <p className="mt-2 flex flex-wrap gap-1.5">
                {data.work.languages.length === 0 ? <span className="text-sm text-muted">—</span> : null}
                {data.work.languages.map((lang) => (
                  <Badge key={lang.code} tone="blue">{vw.has(`lang.${lang.code}` as "lang.ru") ? vw(`lang.${lang.code}` as "lang.ru") : lang.code} {LEVEL[lang.level] ?? lang.level}</Badge>
                ))}
              </p>
              <h4 className="mt-4 text-sm font-bold text-navy-900">{t("placements")}</h4>
              <ul className="mt-2 text-sm">
                {data.work.placements.length === 0 ? <li className="text-muted">—</li> : null}
                {data.work.placements.map((item) => (
                  <li key={`${item.name}-${item.start}`} className="py-0.5">
                    <b className="text-navy-900">{item.name}</b> <span className="text-xs text-muted">{item.start}{item.finish ? ` → ${item.finish}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-navy-900">{t("candidacies")}</h4>
              {data.work.candidacies.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("noCandidacies")}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {data.work.candidacies.map((item) => (
                    <li key={item.vacancy_id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-100 p-3 text-sm">
                      {item.track === "FOREIGN" ? <Flag code={item.country} className="size-7" /> : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-navy-900">{item.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {item.employer}
                          {item.track === "FOREIGN" && countries.has(item.country as "KR") ? ` · ${countries(item.country as "KR")}` : ""}
                        </span>
                      </span>
                      <Badge tone={STAGE_TONE[item.stage] ?? "gray"}>{ag(`stage.${item.stage}` as "stage.DOCS")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {has("payments") && data.payments ? (
        <section className={CARD} aria-labelledby="pays">
          <h3 id="pays" className="text-lg font-extrabold text-navy-900">{t("payments")}</h3>
          {data.payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noPayments")}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {data.payments.map((item) => (
                <li key={item.period} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-bold tabular-nums text-navy-900">{item.period}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums">{money(item.amount)}</span>
                    <Badge tone={item.status === "HELD" ? "red" : item.status === "PAID" ? "green" : "blue"}>{pay(`line.${item.status}` as "line.HELD")}</Badge>
                    {item.reason ? <span className="text-xs text-muted">{pay(`reason.${item.reason}` as "reason.MANUAL")}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={CARD} aria-labelledby="tasks">
          <h3 id="tasks" className="text-lg font-extrabold text-navy-900">{t("tasks")}</h3>
          {data.tasks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noTasks")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {data.tasks.map((task) => (
                <li key={task.id} className={`flex items-start justify-between gap-3 rounded-xl border border-line p-3 text-sm ${task.done ? "bg-surface-100 opacity-60" : "bg-card"}`}>
                  <span className="min-w-0">
                    <span className={`block font-bold text-navy-900 ${task.done ? "line-through" : ""}`}>{task.title}</span>
                    <span className="text-xs text-muted">
                      {teamName(task.team)}
                      {task.from ? ` · ${t("fromTeam", { team: teamName(task.from) })}` : ""}
                      {task.due ? ` · ${task.due}` : ""}
                    </span>
                  </span>
                  {task.done ? <Badge tone="green">{t("taskDone")}</Badge> : (
                    <button type="button" className="shrink-0 text-xs font-bold text-primary hover:underline" onClick={() => void finish(task.id)}>
                      {t("taskDone")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={(event) => void addTask(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>
              {t("taskTitle")}
              <input name="title" className={FIELD} required minLength={3} maxLength={200} />
            </label>
            <label className={label}>
              {t("taskTeam")}
              <select name="team" className={FIELD}>
                {TEAMS.filter((team) => team !== "admin").map((team) => (
                  <option key={team} value={team}>{teamName(team)}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              {t("taskDue")}
              <input name="due" type="date" className={FIELD} />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>{t("taskSave")}</Button>
            </div>
          </form>
        </section>

        <section className={CARD} aria-labelledby="notes">
          <h3 id="notes" className="text-lg font-extrabold text-navy-900">{t("notes")}</h3>
          {data.notes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{t("noNotes")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {data.notes.map((item) => (
                <li key={item.id} className="rounded-xl border border-line bg-surface-100 p-3 text-sm">
                  <p className="whitespace-pre-line text-navy-900">{item.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{item.by ?? "—"} · {teamName(item.team)} · {item.at}</span>
                    {item.shared ? null : <Badge tone="gray">{t("private")}</Badge>}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={(event) => void addNote(event)} className="mt-4 flex flex-col gap-3">
            <label className={label}>
              {t("noteAdd")}
              <textarea name="body" rows={3} required minLength={2} maxLength={2000} className={`${FIELD} py-2`} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <input name="shared" type="checkbox" defaultChecked className="size-4 accent-[var(--primary)]" />
              {t("noteShared")}
            </label>
            <div>
              <Button type="submit" disabled={busy}>{t("noteSave")}</Button>
            </div>
          </form>
        </section>
      </div>
      {note ? <p role="alert" className="text-sm font-semibold text-danger-600">{note}</p> : null}
    </div>
  );
}
