"use client";

import { Button } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CARD } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

export type OwnProfile = {
  slug: string;
  name: string;
  kind: string;
  status: string;
  role: Record<string, string>;
  about: Record<string, string>;
  website: string;
  email: string;
  phone: string;
  address: string;
  updated: string | null;
};

const LOCALES = [
  ["uz-Latn", "UZ"],
  ["uz-Cyrl", "ЎЗ"],
  ["ru", "RU"],
  ["en", "EN"],
] as const;

export function PartnerProfileEditor({ initial }: { initial: OwnProfile[] }) {
  const t = useTranslations("pe");
  const [profiles, setProfiles] = useState(initial);
  const [slug, setSlug] = useState(initial[0]?.slug ?? "");
  const [lang, setLang] = useState<string>("uz-Latn");
  const profile = profiles.find((item) => item.slug === slug) ?? profiles[0];
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (!profile || !draft) return null;

  function choose(next: string) {
    const found = profiles.find((item) => item.slug === next);
    if (!found) return;
    setSlug(next);
    setDraft(found);
    setNote(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote(null);
    const result = await send(`/api/v1/partner/${draft.slug}/profile`, "PUT", {
      role: draft.role,
      about: draft.about,
      website: draft.website,
      email: draft.email,
      phone: draft.phone,
      address: draft.address,
    });
    setBusy(false);
    if (result.ok) {
      setNote({ ok: true, text: t("saved") });
      setProfiles((current) => current.map((item) => (item.slug === draft.slug ? { ...draft, updated: new Date().toISOString().slice(0, 10) } : item)));
    } else {
      setNote({ ok: false, text: t("failed") });
    }
  }

  const setText = (field: "role" | "about", value: string) => setDraft({ ...draft, [field]: { ...draft[field], [lang]: value } });

  return (
    <form onSubmit={(event) => void save(event)} className="flex flex-col gap-5">
      {profiles.length > 1 ? (
        <label className="flex max-w-md flex-col gap-1 text-sm font-semibold text-muted">
          {t("organisation")}
          <select value={slug} onChange={(event) => choose(event.target.value)} className={FIELD}>
            {profiles.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </label>
      ) : null}

      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-navy-900">{draft.name}</h2>
            {profile.updated ? <p className="text-xs text-muted">{t("updated", { date: profile.updated.slice(0, 10) })}</p> : null}
          </div>
          <Link href={`/hamkorlar/${draft.slug}`} className="text-sm font-bold text-primary hover:underline">
            {t("view")} →
          </Link>
        </div>

        <div role="tablist" aria-label="language" className="mt-5 flex gap-2">
          {LOCALES.map(([code, label]) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={lang === code}
              onClick={() => setLang(code)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold ${lang === code ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4">
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("short")}
            <textarea value={draft.role[lang] ?? ""} onChange={(event) => setText("role", event.target.value)} rows={3} maxLength={300} className={`${FIELD} py-2`} />
            <span className="text-xs font-normal text-muted">{t("shortHelp")}</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("about")}
            <textarea value={draft.about[lang] ?? ""} onChange={(event) => setText("about", event.target.value)} rows={7} maxLength={2000} className={`${FIELD} py-2`} />
            <span className="text-xs font-normal text-muted">{t("aboutHelp")}</span>
          </label>
        </div>
      </section>

      <section className={CARD}>
        <p className="text-sm text-muted">{t("privacyNote")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("website")}
            <input value={draft.website} onChange={(event) => setDraft({ ...draft, website: event.target.value })} type="url" placeholder="https://" maxLength={200} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("email")}
            <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} type="email" maxLength={120} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("phone")}
            <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} inputMode="tel" placeholder="+998…" maxLength={20} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-muted">
            {t("address")}
            <input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} maxLength={200} className={FIELD} />
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
        {note ? (
          <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>
            {note.ok ? "✓ " : ""}
            {note.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
