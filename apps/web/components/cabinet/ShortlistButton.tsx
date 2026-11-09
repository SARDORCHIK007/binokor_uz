"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** "Shortlist" on a craftsman's public page; shown to signed-in employers only. */
export function ShortlistButton({ slug }: { slug: string }) {
  const t = useTranslations("shortlist");
  const [employer, setEmployer] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!document.cookie.split("; ").includes("ub_role=employer_local")) return;
    setEmployer(true);
    void fetch("/api/v1/employers/shortlist", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: { slug: string }[]) => setSaved(items.some((item) => item.slug === slug)))
      .catch(() => undefined);
  }, [slug]);

  if (!employer) return null;

  async function toggle() {
    setBusy(true);
    const response = await fetch(`/api/v1/employers/shortlist/${slug}`, { method: saved ? "DELETE" : "PUT", credentials: "include" });
    if (response.ok) setSaved(!saved);
    setBusy(false);
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={saved}
      onClick={() => void toggle()}
      className={`mt-2 block w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${
        saved ? "border-success-600 bg-success-100 text-success-600" : "border-line-strong text-navy-900 hover:border-primary hover:text-primary"
      }`}
    >
      {saved ? t("added") : t("add")}
    </button>
  );
}
