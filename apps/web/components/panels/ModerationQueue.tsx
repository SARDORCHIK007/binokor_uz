"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, CARD } from "@/components/cabinet/kit";
import { FIELD, send } from "@/lib/clientApi";

type Item = { kind: string; id: string; title: string; who: string; created: string; extra: string };
type Queue = { counts: Record<string, number>; total: number; items: Item[] };

const KINDS = ["PORTFOLIO", "FIRM", "FIRM_DOC", "PARTNER", "NEWS"] as const;

export function ModerationQueue() {
  const t = useTranslations("mod");
  const locale = useLocale();
  const [data, setData] = useState<Queue | null>(null);
  const [failed, setFailed] = useState(false);
  const [kind, setKind] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const result = await send<Queue>(`/api/v1/moderation/queue?lang=${locale}${kind ? `&kind=${kind}` : ""}`, "GET");
    if (result.ok && result.data) setData(result.data);
    else setFailed(true);
  }, [locale, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <p role="alert" className="text-sm font-semibold text-danger-600">{t("error")}</p>;
  if (!data) return null;

  async function decide(item: Item, decision: "approve" | "reject") {
    const result = await send("/api/v1/moderation/decide", "POST", { kind: item.kind, id: item.id, decision, reason: decision === "reject" ? reason : undefined });
    setNote(result.ok ? { ok: true, text: t("done") } : { ok: false, text: t("failed") });
    if (result.ok) {
      setRejecting(null);
      setReason("");
      await load();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {["", ...KINDS].map((key) => (
          <button
            key={key || "all"}
            type="button"
            aria-pressed={kind === key}
            onClick={() => setKind(key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-bold ${kind === key ? "border-primary bg-primary text-white" : "border-line bg-card text-navy-900 hover:border-primary"}`}
          >
            {key ? `${t(`kind.${key}` as "kind.NEWS")} · ${data.counts[key] ?? 0}` : `${t("all")} · ${data.total}`}
          </button>
        ))}
      </div>
      {note ? <p role="status" className={`text-sm font-semibold ${note.ok ? "text-success-600" : "text-danger-600"}`}>{note.text}</p> : null}
      {data.items.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className={`${CARD} flex flex-col gap-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-navy-900">{item.title}</p>
                  <p className="text-sm text-muted">{[item.who, item.created].filter(Boolean).join(" · ")}</p>
                </div>
                <Badge tone="blue">{t(`kind.${item.kind}` as "kind.NEWS")}</Badge>
              </div>
              {item.kind === "PORTFOLIO" && item.extra ? <p className="text-xs text-muted">{t("photos", { n: Number(item.extra) })}</p> : null}
              {item.kind === "FIRM" ? <p className="text-xs text-muted">{t("firmHint")}{item.extra ? ` · ${item.extra}` : ""}</p> : null}
              {item.kind === "PARTNER" ? <p className="text-xs text-muted">{t("partnerNote")}</p> : null}

              {rejecting === item.id ? (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                    {t("reason")}
                    <input className={FIELD} value={reason} onChange={(event) => setReason(event.target.value)} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={buttonClass()} onClick={() => void decide(item, "reject")}>{t("confirmReject")}</button>
                    <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => { setRejecting(null); setReason(""); }}>{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {item.kind === "PORTFOLIO" || item.kind === "FIRM" || item.kind === "FIRM_DOC" ? (
                    <button type="button" className={buttonClass()} onClick={() => void decide(item, "approve")}>{item.kind === "FIRM_DOC" ? t("checked") : t("approve")}</button>
                  ) : null}
                  {item.kind === "PORTFOLIO" ? <button type="button" className={buttonClass({ variant: "secondary" })} onClick={() => setRejecting(item.id)}>{t("reject")}</button> : null}
                  {item.kind === "NEWS" ? <Link href="/kabinet/moderatsiya/yangiliklar" className={buttonClass({ variant: "secondary" })}>{t("openEditor")}</Link> : null}
                  {item.kind === "PARTNER" ? <Link href="/kabinet/taklifnomalar" className={buttonClass({ variant: "secondary" })}>{t("openDecision")}</Link> : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
