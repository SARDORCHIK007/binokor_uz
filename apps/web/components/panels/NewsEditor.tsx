"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Article = { id: string; slug: string; title: Record<string, string>; body: Record<string, string>; status: string; published: string };
const LANGS = ["uz-Latn", "uz-Cyrl", "ru", "en"] as const;
const EMPTY = { slug: "", title: {} as Record<string, string>, body: {} as Record<string, string> };

export function NewsEditor() {
  const t = useTranslations("news");
  const [items, setItems] = useState<Article[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [lang, setLang] = useState<(typeof LANGS)[number]>("uz-Latn");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const result = await send<Article[]>("/api/v1/moderation/news", "GET");
    if (result.ok && result.data) setItems(result.data);
    else setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("failed")}</p>;
  if (!items) return null;

  async function save() {
    const result = editing ? await send(`/api/v1/moderation/news/${editing}`, "PUT", form) : await send("/api/v1/moderation/news", "POST", form);
    setNote(result.ok ? { ok: true, text: t("saved") } : { ok: false, text: t("failed") });
    if (result.ok) {
      setEditing(null);
      setForm(EMPTY);
      await load();
    }
  }

  async function publish(id: string, value: boolean) {
    await send(`/api/v1/moderation/news/${id}/publish`, "POST", { publish: value });
    await load();
  }

  async function remove(id: string) {
    const result = await send(`/api/v1/moderation/news/${id}`, "DELETE");
    setNote(result.ok ? { ok: true, text: t("saved") } : { ok: false, text: t("deleteFailed") });
    await load();
  }

  function edit(item: Article) {
    setEditing(item.id);
    setForm({ slug: item.slug, title: item.title ?? {}, body: item.body ?? {} });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const label = "flex flex-col gap-1 text-sm font-semibold text-muted";
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <section className={`${CARD} flex flex-col gap-4 self-start`} aria-labelledby="news-form">
        <h2 id="news-form" className="text-lg font-extrabold text-navy-900">{editing ? t("edit") : t("new")}</h2>
        <label className={label}>
          {t("slug")}
          <input className={FIELD} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
        </label>
        <div className="flex flex-wrap gap-2" role="tablist">
          {LANGS.map((code) => (
            <button key={code} type="button" role="tab" aria-selected={lang === code} onClick={() => setLang(code)} className={`rounded-full border px-3 py-1 text-sm font-bold ${lang === code ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900"}`}>
              {code}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{t("langNote")}</p>
        <label className={label}>
          {t("titleField")} ({lang})
          <input className={FIELD} value={form.title[lang] ?? ""} onChange={(event) => setForm({ ...form, title: { ...form.title, [lang]: event.target.value } })} />
        </label>
        <label className={label}>
          {t("bodyField")} ({lang})
          <textarea className={`${FIELD} min-h-40 py-2`} value={form.body[lang] ?? ""} onChange={(event) => setForm({ ...form, body: { ...form.body, [lang]: event.target.value } })} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={buttonClass()} onClick={() => void save()}>{t("save")}</button>
          {editing ? <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => { setEditing(null); setForm(EMPTY); }}>{t("cancelEdit")}</button> : null}
          {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}
        </div>
      </section>

      <section aria-labelledby="news-list" className="flex flex-col gap-3">
        <h2 id="news-list" className="text-lg font-extrabold text-navy-900">{t("list")}</h2>
        {items.length === 0 ? (
          <EmptyState title={t("empty")} text="" />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id} className={CARD}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-navy-900">{item.title["uz-Latn"] ?? item.slug}</p>
                    <p className="text-xs text-muted">/{item.slug}{item.published ? ` · ${item.published}` : ""}</p>
                  </div>
                  <Badge tone={item.status === "PUBLISHED" ? "green" : "gray"}>{item.status === "PUBLISHED" ? t("published") : t("draft")}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => edit(item)}>{t("edit")}</button>
                  {item.status === "PUBLISHED" ? (
                    <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void publish(item.id, false)}>{t("unpublish")}</button>
                  ) : (
                    <>
                      <button type="button" className={buttonClass()} onClick={() => void publish(item.id, true)}>{t("publish")}</button>
                      <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => void remove(item.id)}>{t("delete")}</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
