import { buttonClass, EmptyState, StatusBadge } from "@uychibinokor/ui";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { demoCertificate } from "@/lib/demo";

type PageProps = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return { title: `${number} · UYCHI BINOKOR` };
}

export default async function VerifyPage({ params }: PageProps) {
  const { number } = await params;
  const t = await getTranslations("verify");
  const trade = await getTranslations("trades");
  const destinations = await getTranslations("destinations");

  if (number !== demoCertificate.number) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState title={t("notFoundTitle")} text={t("notFoundText")} action={<Link href="/" className={buttonClass({ variant: "secondary" })}>UYCHI BINOKOR</Link>} />
      </div>
    );
  }

  const person = demoCertificate;
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <p className="mb-3 text-sm text-muted">{t("demoNote")}</p>
      <section className="rounded-md bg-success-100 p-5 text-success-600">
        <p className="flex items-center gap-2 text-lg font-bold">
          <StatusBadge tone="success">{t("valid")}</StatusBadge>
        </p>
        <p className="mt-3 text-base font-semibold text-ink">№ {person.number}</p>
        <p className="text-sm">{t("signature")}</p>
      </section>

      <section className="mt-4 rounded-md border border-line bg-card p-5 shadow-sh1">
        <div className="flex gap-4">
          <div className="flex size-16 items-center justify-center rounded-sm bg-blue-100 text-lg font-bold text-primary" aria-hidden="true">
            AK
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">{person.name}</h1>
            <p className="text-base text-muted">
              {trade(person.trade)} · {t(person.levelKey)}
            </p>
            <p className="text-sm text-muted">
              ★ {person.rating} ({person.reviews})
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">{t("certs")}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li>
            <StatusBadge tone="success">{t("platformCert")}</StatusBadge>
            <p className="mt-1 text-muted">{person.issued}</p>
          </li>
          <li>
            <StatusBadge tone="success">{t("stateCert")}</StatusBadge>
            <p className="mt-1 text-muted">{t("registryLater")}</p>
          </li>
        </ul>

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">{t("experience")}</h2>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {person.hours} {t("hours")}
        </p>

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">{t("languages")}</h2>
        <p className="mt-1">
          {destinations(`${person.language}Lang`)}: {person.words} / 1000 {t("words")}
        </p>

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">{t("portfolio")}</h2>
        <p className="mt-1 text-sm text-muted">{t("portfolioEmpty")}</p>

        <p className="mt-6">
          <StatusBadge tone="success">{t("free")}</StatusBadge>
        </p>
      </section>

      <div className="mt-4 rounded-md border border-line bg-card p-3">
        <div className="flex flex-col gap-2">
          <Link href="/kabinet/panel" className={buttonClass({ size: "lg", className: "w-full" })}>
            {t("request")}
          </Link>
          <p className="text-center text-sm text-muted">{t("pdfLater")}</p>
        </div>
      </div>
    </div>
  );
}
