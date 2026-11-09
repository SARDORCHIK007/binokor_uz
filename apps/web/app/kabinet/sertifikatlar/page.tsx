import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { CertificateDecision } from "@/components/cabinet/CertificateDecision";
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
  const t = await getTranslations("states");
  const rows = await apiAuth<Item[]>("/api/v1/certificates?status=PENDING_APPROVAL");
  if (!rows) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }
  if (rows.length === 0) {
    return <EmptyState title="Navbat bo'sh" text="Tasdiq kutayotgan sertifikat yo'q." />;
  }
  return (
    <div className="p-4">
      <h1 className="text-3xl font-extrabold text-[#071833]">Sertifikat navbati</h1>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((item) => (
          <li key={item.id} className="rounded-[20px] border border-[#e5eaf2] bg-white shadow-sm p-4">
            <p className="font-semibold">
              {item.holder} · {item.trade}
            </p>
            <p className="text-sm text-muted">
              {item.status} · tasdiq {item.approvals}/2 · davomat {item.attendance_pct ?? "—"}% · nazariya{" "}
              {item.theory_score ?? "—"} · amaliy {item.practice_score ?? "—"}
            </p>
            <div className="mt-3">
              <CertificateDecision id={item.id} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
