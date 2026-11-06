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

const COPY = {
  "uz-Latn": { missing: "Sertifikat topilmadi", missingText: "Raqam bazada yo'q.", ok: "Tasdiqlandi", home: "Bosh sahifa", check: "QR tekshiruvi" },
  "uz-Cyrl": { missing: "Сертификат топилмади", missingText: "Рақам базада йўқ.", ok: "Тасдиқланди", home: "Бош саҳифа", check: "QR текшируви" },
  ru: { missing: "Сертификат не найден", missingText: "Номера нет в базе.", ok: "Подтверждён", home: "На главную", check: "Проверка QR" },
  en: { missing: "Certificate not found", missingText: "This number is not in the database.", ok: "Verified", home: "Home", check: "QR check" },
  de: { missing: "Zertifikat nicht gefunden", missingText: "Diese Nummer steht nicht in der Datenbank.", ok: "Gültig", home: "Start", check: "QR-Prüfung" },
  ar: { missing: "الشهادة غير موجودة", missingText: "هذا الرقم غير موجود في قاعدة البيانات.", ok: "صالحة", home: "الرئيسية", check: "فحص الرمز" },
} as const;

type Lang = keyof typeof COPY;
type PageProps = { params: Promise<{ number: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number} · UYCHI BINOKOR` };
}

export default async function VerifyPage({ params, searchParams }: PageProps) {
  const { number } = await params;
  const query = await searchParams;
  const lang: Lang = query.lang && query.lang in COPY ? (query.lang as Lang) : "uz-Latn";
  const copy = COPY[lang];
  const data = await apiGet<VerifyPayload>(`/api/v1/public/verify/${number}`);
  const dir = lang === "ar" ? "rtl" : "ltr";
  if (!data || data.result === "NOT_FOUND") {
    return (
      <div className="mx-auto max-w-lg px-4 py-10" dir={dir} lang={lang}>
        <EmptyState
          title={copy.missing}
          text={copy.missingText}
          action={
            <Link href="/" className={buttonClass({ variant: "secondary" })}>
              {copy.home}
            </Link>
          }
        />
      </div>
    );
  }
  const valid = data.result === "VALID" && data.signature_valid;
  return (
    <div className="mx-auto max-w-lg px-4 py-6" dir={dir} lang={lang}>
      <p className="mb-3 flex flex-wrap gap-2 text-sm">
        {(Object.keys(COPY) as Lang[]).map((item) => (
          <Link key={item} href={`/verify/${number}?lang=${item}`} className="rounded-sm border border-line px-2 py-1">
            {item}
          </Link>
        ))}
      </p>
      <section className={`rounded-md p-5 ${valid ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"}`}>
        <StatusBadge tone={valid ? "success" : "danger"}>{valid ? copy.ok : data.result}</StatusBadge>
        <p className="mt-3 text-base font-semibold text-ink">№ {data.certificate?.number}</p>
        <p className="text-sm">{data.holder?.display_name}</p>
        <p className="text-sm">
          {data.certificate?.trade} · {data.certificate?.level}
        </p>
      </section>
      <section className="mt-4 rounded-md border border-line bg-card p-5">
        <p className="text-sm text-muted">{copy.check}</p>
        <p className="mt-2 break-all font-mono text-sm">/verify/{number}</p>
        <Link href={`/api/v1/public/verify/${number}/pdf`} className={`${buttonClass({ variant: "secondary" })} mt-4`}>
          PDF
        </Link>
      </section>
    </div>
  );
}
