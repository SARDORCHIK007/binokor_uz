import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { CertificateDecision } from "@/components/cabinet/CertificateDecision";
import { Badge, CARD, Meter, PageHead, initials } from "@/components/cabinet/kit";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Item = {
  id: string;
  number: string | null;
  status: string;
  holder: string;
  trade: string;
  approvals: number;
  attendance_pct: number | null;
  theory_score: number | null;
  practice_score: number | null;
};

export default async function CertificatesPage() {
  const t = await getTranslations("adm");
  const rows = await apiAuth<Item[]>("/api/v1/certificates?status=PENDING_APPROVAL");
  if (!rows) {
    return <EmptyState title={t("loadError")} text="" />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("certs.title")} text={t("certs.text")} />
      {rows.length === 0 ? (
        <EmptyState title={t("certs.empty")} text={t("certs.emptyText")} />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((item) => (
            <li key={item.id} className={CARD}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-sm font-bold text-warning-600" aria-hidden="true">
                    {initials(item.holder)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-navy-900">{item.holder}</p>
                    <p className="truncate text-sm text-muted">{item.trade}</p>
                  </div>
                </div>
                <Badge tone="amber">{t("certs.approvals", { n: item.approvals })}</Badge>
              </div>
              <div className="mt-4 mb-4">
                <Meter value={(100 * item.approvals) / 2} tone="amber" label={t("certs.approvals", { n: item.approvals })} />
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  [t("certs.attendance"), item.attendance_pct === null ? "—" : `${item.attendance_pct}%`],
                  [t("certs.theory"), item.theory_score ?? "—"],
                  [t("certs.practice"), item.practice_score ?? "—"],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl bg-canvas p-2.5">
                    <dd className="text-lg font-extrabold text-navy-900 tabular-nums">{value}</dd>
                    <dt className="text-xs text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
              <div className="mt-4">
                <CertificateDecision id={item.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
