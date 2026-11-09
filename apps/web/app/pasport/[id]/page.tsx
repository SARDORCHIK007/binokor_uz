import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PAGE } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Public = {
  valid: boolean;
  number?: string;
  name?: string;
  trade?: string;
  group?: string;
  status?: string;
  enrolled_at?: string;
  fingerprint?: string;
};

/** Opened by the QR on the passport card. Shows a first name, trade, group and status only. */
export default async function PublicPassportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations("passportPage");
  const nav = await getTranslations("nav");
  const data = await apiGet<Public>(`/api/v1/public/passport/${encodeURIComponent(id)}`);
  const valid = Boolean(data?.valid);
  return (
    <div className={PAGE}>
      <nav aria-label="breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">{nav("home")}</Link>
        <span className="mx-2 text-faint" aria-hidden="true">›</span>
        <span className="font-semibold text-navy-900">{t("publicTitle")}</span>
      </nav>
      <article className="mx-auto mt-8 max-w-xl overflow-hidden rounded-3xl border border-line bg-card shadow-sh2">
        <div className={`px-6 py-8 text-center ${valid ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"}`}>
          <span className="grid mx-auto size-16 place-items-center rounded-full border-4 border-current text-3xl font-black" aria-hidden="true">
            {valid ? "✓" : "✕"}
          </span>
          <p className="mt-3 text-xl font-black tracking-wide">{valid ? t("valid") : t("invalid")}</p>
        </div>
        {valid && data ? (
          <div className="p-6 sm:p-8">
            <h1 className="text-3xl font-extrabold text-navy-900">{data.name}</h1>
            <p className="mt-1 text-lg font-bold text-primary">{data.trade}</p>
            <dl className="mt-5 divide-y divide-line text-sm">
              {[
                [t("number"), data.number],
                [t("group"), data.group],
                [t("enrolled"), data.enrolled_at],
                [t("signature"), data.fingerprint],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between gap-3 py-2.5">
                  <dt className="text-muted">{term}</dt>
                  <dd className="font-semibold text-navy-900 tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 py-2.5">
                <dt className="text-muted">{t("statusLabel")}</dt>
                <dd className="font-semibold text-navy-900">{t(`status.${data.status}` as "status.ACTIVE")}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-muted">{t("privacy")}</p>
          </div>
        ) : null}
      </article>
    </div>
  );
}
