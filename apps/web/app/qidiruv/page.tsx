import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CERT_PATTERN } from "@/lib/demo";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim().toUpperCase();
  if (CERT_PATTERN.test(query)) {
    redirect(`/verify/${query}`);
  }
  const t = await getTranslations("search");
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">{t("title")}</h1>
      <EmptyState
        title={t("emptyTitle")}
        text={t("emptyText")}
        action={
          <Link href="/" className={buttonClass({ variant: "secondary" })}>
            {t("back")}
          </Link>
        }
      />
    </div>
  );
}
