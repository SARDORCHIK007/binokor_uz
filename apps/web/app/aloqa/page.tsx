import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiGet } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const t = await getTranslations("states");
  const page = await apiGet<{ title: string; body: string }>("/api/v1/public/pages/aloqa");
  if (!page) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("errorTitle")} text={t("errorText")} />
      </div>
    );
  }
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-4xl font-semibold text-navy-900">{page.title}</h1>
      <p className="mt-4 text-lg text-ink">{page.body}</p>
    </article>
  );
}
