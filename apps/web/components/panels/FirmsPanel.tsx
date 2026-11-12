"use client";

import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, CARD } from "@/components/cabinet/kit";
import { Flag } from "@/components/Flag";
import { send } from "@/lib/clientApi";

type Firm = {
  id: string;
  name: string;
  country: string;
  verified: boolean;
  vacancies: number;
  places: number;
  legal: Record<"legal_name" | "registration_no" | "address" | "website" | "contact_person" | "contact_email" | "contact_phone" | "description", string>;
  documents: { id: string; kind: string; filename: string; size_bytes: number; checked: boolean }[];
};

export function FirmsPanel({ initial, canManage }: { initial: Firm[]; canManage: boolean }) {
  const t = useTranslations("ag");
  const vw = useTranslations("vw");
  const countries = useTranslations("countries");
  const [firms, setFirms] = useState(initial);
  const [note, setNote] = useState("");

  async function reload() {
    const fresh = await send<Firm[]>("/api/v1/vacancies/firms", "GET");
    if (fresh.ok && fresh.data) setFirms(fresh.data);
  }

  async function verify(firm: Firm, verified: boolean) {
    setNote("");
    const result = await send(`/api/v1/vacancies/firms/${firm.id}/verify`, "POST", { verified });
    if (!result.ok) setNote(result.status === 409 ? t("firms.needRegistration") : t("desk.failed"));
    await reload();
  }

  async function check(docId: string) {
    await send(`/api/v1/vacancies/documents/${docId}/check`, "POST");
    await reload();
  }

  if (firms.length === 0) return <EmptyState title={t("firms.empty")} text="" />;

  return (
    <div className="flex flex-col gap-4">
      {note ? (
        <p role="status" className="text-sm font-semibold text-danger-600">
          {note}
        </p>
      ) : null}
      <ul className="grid gap-4 xl:grid-cols-2">
        {firms.map((firm) => (
          <li key={firm.id} className={`${CARD} flex flex-col gap-4`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <Flag code={firm.country} className="mt-0.5 size-10" />
                <div className="min-w-0">
                  <p className="font-extrabold text-navy-900">{firm.legal.legal_name || firm.name}</p>
                  <p className="text-sm text-muted">
                    {countries.has(firm.country as "KR") ? countries(firm.country as "KR") : firm.country} · {t("firms.vacancies", { v: firm.vacancies, p: firm.places })}
                  </p>
                </div>
              </div>
              <Badge tone={firm.verified ? "green" : "amber"}>{firm.verified ? t("firms.verified") : t("firms.unverified")}</Badge>
            </div>
            <dl className="grid gap-1.5 text-sm">
              {([["firms.reg", firm.legal.registration_no], ["firms.contact", firm.legal.contact_person], ["", firm.legal.contact_email], ["", firm.legal.contact_phone], ["", firm.legal.address], ["", firm.legal.website]] as const)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={`${key}${value}`} className="flex gap-2">
                    {key ? <dt className="text-muted">{t(key as "firms.reg")}:</dt> : null}
                    <dd className="min-w-0 font-semibold break-words text-navy-900">{value}</dd>
                  </div>
                ))}
            </dl>
            <div>
              <h3 className="text-xs font-extrabold tracking-wider text-muted uppercase">{t("firms.docs")}</h3>
              {firm.documents.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("firms.noDocs")}</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {firm.documents.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-navy-900">{doc.filename}</span>
                        <span className="text-xs text-muted">{vw(`docKind.${doc.kind}` as "docKind.OTHER")}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <a href={`/api/v1/vacancies/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">
                          {vw("docs.open")}
                        </a>
                        {doc.checked ? (
                          <Badge tone="green">{t("firms.checked")}</Badge>
                        ) : canManage ? (
                          <button type="button" className="font-bold text-primary hover:underline" onClick={() => void check(doc.id)}>
                            {t("firms.check")}
                          </button>
                        ) : (
                          <Badge tone="amber">{vw("docs.pending")}</Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {canManage ? (
              <div>
                <button type="button" className={buttonClass({ variant: firm.verified ? "secondary" : "primary" })} onClick={() => void verify(firm, !firm.verified)}>
                  {firm.verified ? t("firms.unverify") : t("firms.verify")}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
