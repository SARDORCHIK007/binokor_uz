import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { QrMark } from "@/components/QrMark";
import { PAGE } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

type Worker = {
  name: string;
  trade: string;
  level: string;
  availability: string;
  rating: number | null;
  hours: number;
  certificate_number?: string | null;
};

const levelName: Record<string, string> = {
  ASSISTANT: "Yordamchi",
  INDEPENDENT: "Mustaqil",
  MASTER: "Usta",
  BRIGADIER: "Brigadir",
};

export default async function WorkerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getTranslations("states");
  const worker = await apiGet<Worker>(`/api/v1/public/workers/${slug}`);
  if (!worker) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  const verifyPath = worker.certificate_number ? `/verify/${worker.certificate_number}` : "";
  return (
    <article className={PAGE}>
      <div>
        <nav aria-label="Yo'l" className="mb-5 text-sm text-muted">
          <Link href="/" className="hover:text-primary">Bosh sahifa</Link> <span aria-hidden="true">›</span>{" "}
          <Link href="/ustalar" className="hover:text-primary">Ustalar</Link> <span aria-hidden="true">›</span>{" "}
          <span className="font-semibold text-navy-900">{worker.name}</span>
        </nav>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-line bg-card p-6 shadow-sh1">
            <div className="flex items-center gap-4">
              <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-blue-100 text-3xl font-extrabold text-primary ring-1 ring-blue-200" aria-hidden="true">
                {worker.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{worker.name}</h1>
                <p className="text-sm text-muted">Usta ({levelName[worker.level] ?? worker.level})</p>
                {worker.certificate_number ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success-600 px-3 py-0.5 text-xs font-semibold text-white">
                    <Icon name="check" className="size-3.5" /> Sertifikatli
                  </span>
                ) : null}
                <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-navy-900">
                  <Icon name="star" className="size-4 text-accent" />
                  {worker.rating === null ? "Reyting yo'q" : `${worker.rating.toFixed(1)} / 5`}
                </p>
              </div>
            </div>
            <dl className="mt-6 divide-y divide-[#e9edf2] text-sm">
              <div className="flex items-center gap-3 py-3"><Icon name="briefcase" className="size-5 text-primary" /><dt className="text-muted">Mutaxassislik</dt><dd className="ml-auto font-semibold text-navy-900">{worker.trade}</dd></div>
              <div className="flex items-center gap-3 py-3"><Icon name="clock" className="size-5 text-primary" /><dt className="text-muted">Tasdiqlangan soat</dt><dd className="ml-auto font-semibold text-navy-900">{worker.hours}</dd></div>
              <div className="flex items-center gap-3 py-3"><Icon name="calendar" className="size-5 text-primary" /><dt className="text-muted">Bandlik</dt><dd className="ml-auto font-semibold text-navy-900">{worker.availability}</dd></div>
              <div className="flex items-center gap-3 py-3"><Icon name="award" className="size-5 text-primary" /><dt className="text-muted">Malaka sertifikati</dt><dd className="ml-auto font-semibold text-navy-900">{worker.certificate_number ? "Bor" : "Yo'q"}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Telefon va shaxsiy hujjatlar ko&apos;rsatilmaydi. Aloqa menejer orqali.</p>
          </section>
          <section className="overflow-hidden rounded-2xl bg-white text-center shadow-sh2">
            <h2 className="bg-primary px-4 py-3 text-lg font-bold text-white">QR ishchi pasporti</h2>
            <div className="p-5">
              <div className="flex justify-center">
                {verifyPath ? <QrMark value={`https://uychibinokor.uz${verifyPath}`} /> : <p className="py-10 text-sm text-muted">Sertifikat hali yo&apos;q</p>}
              </div>
              {verifyPath ? (
                <Link href={verifyPath} className="mt-5 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-white hover:bg-primary-hover">
                  Sertifikatni tekshirish: {worker.certificate_number}
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
