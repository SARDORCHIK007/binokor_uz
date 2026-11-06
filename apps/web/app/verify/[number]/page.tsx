import { buttonClass, EmptyState, StatusBadge } from "@uychibinokor/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type VerifyPayload = {
  result: string;
  signature_valid: boolean;
  certificate?: {
    number: string;
    issuer: string;
    trade: string | null;
    level: string | null;
    issued_at: string | null;
  };
  holder?: { display_name: string };
};

type PageProps = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number} · UYCHI BINOKOR` };
}

export default async function VerifyPage({ params }: PageProps) {
  const { number } = await params;
  const data = await apiGet<VerifyPayload>(`/api/v1/public/verify/${number}`);
  if (!data || data.result === "NOT_FOUND") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          title="Sertifikat topilmadi"
          text="Raqam bazada yo'q yoki hali berilmagan."
          action={
            <Link href="/" className={buttonClass({ variant: "secondary" })}>
              UYCHI BINOKOR
            </Link>
          }
        />
      </div>
    );
  }
  const valid = data.result === "VALID" && data.signature_valid;
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <section className={`rounded-md p-5 ${valid ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"}`}>
        <StatusBadge tone={valid ? "success" : "danger"}>{valid ? "Tasdiqlandi" : data.result}</StatusBadge>
        <p className="mt-3 text-base font-semibold text-ink">№ {data.certificate?.number}</p>
        <p className="text-sm">{data.holder?.display_name}</p>
        <p className="text-sm">
          {data.certificate?.trade} · {data.certificate?.level}
        </p>
      </section>
      <section className="mt-4 rounded-md border border-line bg-card p-5">
        <p className="text-sm text-muted">QR tekshiruvi shu sahifaga olib keladi.</p>
        <p className="mt-2 break-all font-mono text-sm">/verify/{number}</p>
        <Link href={`/api/v1/public/verify/${number}/pdf`} className={`${buttonClass({ variant: "secondary" })} mt-4`}>
          PDF
        </Link>
      </section>
    </div>
  );
}
