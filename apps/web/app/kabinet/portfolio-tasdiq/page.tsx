"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Pending = { id: string; title: string; image: string | null; worker: string; slug: string; created_at: string };

export default function PortfolioReviewPage() {
  const t = useTranslations("portfolio");
  const states = useTranslations("states");
  const [items, setItems] = useState<Pending[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/portfolio", { credentials: "include" });
      if (!response.ok) {
        throw new Error("load");
      }
      setItems((await response.json()) as Pending[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirm(id: string) {
    await fetch(`/api/v1/admin/portfolio/${id}/confirm`, { method: "POST", credentials: "include" });
    await load();
  }

  if (state === "loading") {
    return <div className="h-64 animate-pulse rounded-2xl bg-card" aria-label={states("loading")} />;
  }
  if (state === "error" || !items) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("reviewTitle")}</h1>
        <p className="mt-2 max-w-[62ch] text-muted">{t("reviewText")}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("reviewTitle")} text={t("queueEmpty")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-sh1">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} className="aspect-[4/3] w-full object-cover" />
              ) : null}
              <div className="flex flex-col gap-2 p-4">
                <p className="font-semibold text-navy-900">{item.title}</p>
                <Link href={`/ustalar/${item.slug}`} className="text-sm text-primary hover:underline">
                  {item.worker}
                </Link>
                <button
                  type="button"
                  onClick={() => void confirm(item.id)}
                  className="mt-1 min-h-10 rounded-xl bg-success-600 px-4 text-sm font-bold text-white hover:bg-teal-700"
                >
                  {t("confirm")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
