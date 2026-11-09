import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { CARD, ErrorPage, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const t = await getTranslations("states");
  const page = await apiGet<{ title: string; body: string }>("/api/v1/public/pages/aloqa");
  if (!page) {
    return (
      <ErrorPage>
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </ErrorPage>
    );
  }
  return (
    <article className={PAGE}>
      <PageHeader title={page.title} />
      <div className={`${CARD} max-w-3xl p-6 sm:p-8`}>
        <p className="text-lg leading-relaxed whitespace-pre-line text-body">{page.body}</p>
      </div>
    </article>
  );
}
