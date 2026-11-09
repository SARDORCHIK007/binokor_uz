import { buttonClass, EmptyState } from "@uychibinokor/ui";
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
  "uz-Latn": { missing: "Sertifikat topilmadi", missingText: "Raqam bazada yo'q.", ok: "HAQIQIY", home: "Bosh sahifa", check: "Sertifikat tekshiruvi" },
  "uz-Cyrl": { missing: "Сертификат топилмади", missingText: "Рақам базада йўқ.", ok: "ҲАҚИҚИЙ", home: "Бош саҳифа", check: "Сертификат текшируви" },
  ru: { missing: "Сертификат не найден", missingText: "Номера нет в базе.", ok: "ДЕЙСТВИТЕЛЕН", home: "На главную", check: "Проверка сертификата" },
  en: { missing: "Certificate not found", missingText: "This number is not in the database.", ok: "VERIFIED", home: "Home", check: "Certificate verification" },
  de: { missing: "Zertifikat nicht gefunden", missingText: "Diese Nummer steht nicht in der Datenbank.", ok: "GÜLTIG", home: "Start", check: "Zertifikatsprüfung" },
  ar: { missing: "الشهادة غير موجودة", missingText: "هذا الرقم غير موجود في قاعدة البيانات.", ok: "صالحة رسمياً", home: "الرئيسية", check: "التحقق من الشهادة" },
} as const;

type Lang = keyof typeof COPY;

const STATUS = {
  REVOKED: { "uz-Latn": "BEKOR QILINGAN", "uz-Cyrl": "БЕКОР ҚИЛИНГАН", ru: "ОТОЗВАН", en: "REVOKED", de: "WIDERRUFEN", ar: "ملغاة" },
  TAMPERED: { "uz-Latn": "IMZO MOS EMAS", "uz-Cyrl": "ИМЗО МОС ЭМАС", ru: "ПОДПИСЬ НЕВЕРНА", en: "SIGNATURE INVALID", de: "SIGNATUR UNGÜLTIG", ar: "التوقيع غير صالح" },
} as const;
type PageProps = { params: Promise<{ number: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number} · UYCHI BINOKOR Sertifikat tekshiruvi` };
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
      <div className="mx-auto max-w-lg px-4 py-16" dir={dir} lang={lang}>
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
  const label = valid ? copy.ok : (STATUS[data.result as keyof typeof STATUS]?.[lang] ?? STATUS.TAMPERED[lang]);

  return (
    <div className="bg-[#F4F6F9] min-h-screen px-4 py-12" dir={dir} lang={lang}>
      <article className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-[0_16px_48px_rgba(7,24,51,0.08)] border border-[#e5eaf2]">
        {/* Tillar paneli (6 tilda: TZ 22-sahifa) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f3f8] bg-[#f8fafc] px-6 py-3 text-xs">
          <span className="font-semibold text-[#5f6b7d]">{copy.check}</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(COPY) as Lang[]).map((item) => (
              <Link
                key={item}
                href={`/verify/${number}?lang=${item}`}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  lang === item ? "bg-[#2F6BFF] text-white" : "text-[#5f6b7d] hover:bg-white"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div className="p-8 sm:p-12 text-center">
          {/* Katta HAQIQIY muhri (Dizayn va TZ 13-sahifa 7-blok talabi) */}
          <div className="flex justify-center">
            <div
              className={`flex size-44 items-center justify-center rounded-full border-8 shadow-lg text-center transition ${
                valid
                  ? "border-[#1f8a4c] bg-[#e8f7ee] text-[#1f8a4c]"
                  : "border-[#b42318] bg-[#fde7e5] text-[#b42318]"
              }`}
            >
              <div>
                <span className="text-3xl block">{valid ? "✓" : "✕"}</span>
                <span className="px-3 text-lg font-black tracking-wider block mt-1">{label}</span>
                {valid ? <span className="text-[10px] uppercase tracking-wider block font-bold text-[#1f8a4c]/80">Ed25519</span> : null}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <span className="font-mono text-sm font-bold text-[#2F6BFF] bg-[#eef3ff] px-3.5 py-1 rounded-full">
              № {data.certificate?.number}
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black text-[#071833]">
              {data.holder?.display_name}
            </h1>
            <p className="mt-2 text-lg font-bold text-[#2F6BFF]">
              {data.certificate?.trade}
            </p>
            <p className="text-sm font-semibold text-[#5f6b7d] mt-1">
              Malaka toifasi: <span className="text-[#071833]">{data.certificate?.level}</span>
            </p>
          </div>

          {/* Sertifikat beruvchi va parametrlar */}
          <div className="mt-8 rounded-2xl bg-[#f8fafc] p-6 text-left text-xs sm:text-sm space-y-3 border border-[#e5eaf2]">
            <div className="flex justify-between">
              <span className="text-[#5f6b7d]">Beruvchi tashkilot:</span>
              <strong className="text-[#071833] text-right">{data.certificate?.issuer}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5f6b7d]">Berilgan sana:</span>
              <strong className="text-[#071833]">{data.certificate?.issued_at ?? "—"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5f6b7d]">Raqamli imzo holati:</span>
              <strong className={valid ? "text-[#1f8a4c]" : "text-[#b42318]"}>{valid ? "✓ Ed25519" : "✕ Ed25519"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5f6b7d]">QR havola holati:</span>
              <strong className="text-[#071833]">uychibinokor.uz/v/{data.certificate?.number}</strong>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link
              href="/"
              className="rounded-xl border border-[#d9dfe8] px-6 py-3 text-sm font-bold text-[#071833] hover:bg-gray-50 transition"
            >
              Bosh sahifa
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
