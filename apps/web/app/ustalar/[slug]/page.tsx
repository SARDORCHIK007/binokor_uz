import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
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
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">{worker.name}</h1>
      <p className="mt-3 text-lg">
        {worker.trade} · {worker.level}
      </p>
      <p className="mt-2 text-muted">
        {worker.hours} soat · {worker.availability}
        {worker.rating === null ? "" : ` · ${worker.rating}`}
      </p>
      {worker.certificate_number ? (
        <p className="mt-4">
          <Link href={`/verify/${worker.certificate_number}`} className="text-primary">
            QR pasport · {worker.certificate_number}
          </Link>
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">Platforma sertifikati hali bog'lanmagan.</p>
      )}
    </article>
  );
}
