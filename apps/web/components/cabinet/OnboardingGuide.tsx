"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CABINET_MENUS } from "@/lib/menus";

/** First steps per role. A step counts as done once that page has been opened. */
const STEPS: Record<string, string[]> = {
  worker: ["portfolio", "workerProfile", "offers", "passport"],
  student: ["myApplication", "attendance", "grades", "passport"],
  mentor: ["groups", "attendance", "grades", "schedule"],
  admin: ["applications", "groups", "certificates", "signing"],
  employer_local: ["employer", "postings", "shortlist"],
  producer: ["products", "producerStats"],
};

type State = { seen: string[]; hidden: boolean };

const KEY = (role: string) => `ub_onb_${role}`;

function load(role: string): State {
  try {
    const raw = window.localStorage.getItem(KEY(role));
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* storage may be blocked */
  }
  return { seen: [], hidden: false };
}

function save(role: string, value: State) {
  try {
    window.localStorage.setItem(KEY(role), JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Records which cabinet pages the person has opened, so the guide can tick them off. */
export function OnboardingTracker({ role }: { role: string }) {
  const path = usePathname();
  useEffect(() => {
    if (!STEPS[role] || !path.startsWith("/kabinet")) return;
    const state = load(role);
    if (!state.seen.includes(path)) save(role, { ...state, seen: [...state.seen, path] });
  }, [role, path]);
  return null;
}

export function OnboardingGuide({ role }: { role: string }) {
  const t = useTranslations("onb");
  const cabinet = useTranslations("cabinet");
  const [state, setState] = useState<State | null>(null);
  const keys = STEPS[role];

  useEffect(() => {
    setState(load(role));
  }, [role]);

  if (!keys || !state || state.hidden) return null;
  const menu = CABINET_MENUS[role] ?? [];
  const steps = keys.flatMap((key) => {
    const item = menu.find((entry) => entry.key === key);
    return item ? [{ key, href: item.href, done: state.seen.includes(item.href) }] : [];
  });
  const done = steps.filter((step) => step.done).length;
  const pct = steps.length ? Math.round((100 * done) / steps.length) : 0;

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sh1" aria-labelledby="onb-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="onb-title" className="text-lg font-extrabold text-navy-900">
            {done === steps.length ? t("allDone") : t("title")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t("sub", { done, total: steps.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = { ...state, hidden: true };
            save(role, next);
            setState(next);
          }}
          className="rounded-lg px-2.5 py-1 text-xs font-bold text-muted hover:bg-surface-100 hover:text-navy-900"
        >
          {t("hide")}
        </button>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-surface-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("title")}
      >
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li key={step.key}>
            <Link
              href={step.href}
              className={`flex items-start gap-3 rounded-xl border p-3 transition hover:border-primary ${
                step.done ? "border-success-600/30 bg-success-100" : "border-line bg-surface-100"
              }`}
            >
              <span
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                  step.done ? "bg-success-600 text-white" : "bg-card text-navy-900 ring-1 ring-line-strong"
                }`}
                aria-hidden="true"
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-navy-900">{cabinet(step.key as "panel")}</span>
                <span className="block text-xs text-muted">{t(`step.${step.key}` as "step.portfolio")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
