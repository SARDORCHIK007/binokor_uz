"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/Icon";

type Item = { id: string; title: string; image: string | null; confirmed: boolean; created_at: string };
type Payload = { slug: string; items: Item[] };

const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";
const MAX = 5_000_000;

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PortfolioPage() {
  const t = useTranslations("portfolio");
  const states = useTranslations("states");
  const [data, setData] = useState<Payload | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/me/portfolio", { credentials: "include" });
      if (response.status === 403 || response.status === 401) {
        setState("forbidden");
        return;
      }
      if (!response.ok) {
        throw new Error("load");
      }
      setData((await response.json()) as Payload);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      return;
    }
    if (file.size > MAX) {
      setMessage(t("tooBig"));
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/me/portfolio", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content_type: file.type, data_base64: await toBase64(file) }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { detail?: string };
        setMessage(body.detail ?? t("failed"));
        return;
      }
      setTitle("");
      setFile(null);
      (event.target as HTMLFormElement).reset();
      await load();
    } catch {
      setMessage(t("failed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/v1/me/portfolio/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  if (state === "loading") {
    return <div className="h-64 animate-pulse rounded-2xl bg-card" aria-label={states("loading")} />;
  }
  if (state === "forbidden") {
    return <EmptyState title={t("title")} text={t("noProfile")} />;
  }
  if (state === "error" || !data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
          <p className="mt-2 max-w-[62ch] text-muted">{t("text")}</p>
        </div>
        <Link href={`/ustalar/${data.slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          {t("viewProfile")} <Icon name="arrow" className="size-4" />
        </Link>
      </div>

      <form onSubmit={upload} className="grid gap-3 rounded-2xl border border-line bg-card p-5 shadow-sh1 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
          {t("workTitle")}
          <input required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("workPlaceholder")} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy-900">
          {t("photo")}
          <input
            required
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="min-h-11 w-full rounded-xl border border-dashed border-line-strong bg-canvas px-3 py-2 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:font-semibold file:text-primary"
          />
        </label>
        <button type="submit" disabled={busy || !file} className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50">
          {busy ? t("uploading") : t("upload")}
        </button>
        {message ? <p className="text-sm font-semibold text-danger-600 md:col-span-3">{message}</p> : null}
      </form>

      {data.items.length === 0 ? (
        <EmptyState title={t("title")} text={t("empty")} />
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-sh1">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} className="aspect-[4/3] w-full object-cover" />
              ) : null}
              <div className="flex flex-col gap-2 p-3">
                <p className="line-clamp-2 text-sm font-semibold text-navy-900">{item.title}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.confirmed ? "bg-success-100 text-success-600" : "bg-warning-100 text-warning-600"}`}>
                    {item.confirmed ? <Icon name="check" className="mr-0.5 inline size-3" /> : null}
                    {item.confirmed ? t("confirm") : t("pending")}
                  </span>
                  <button type="button" onClick={() => void remove(item.id)} className="text-xs font-semibold text-muted hover:text-danger-600">
                    {t("delete")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
