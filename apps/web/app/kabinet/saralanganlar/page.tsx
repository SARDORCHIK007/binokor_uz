import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { CompareList } from "@/components/cabinet/CompareList";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Item = { slug: string; name: string; level: string; availability: string; rating: number | null; hours: number; trade: string };

export default async function ShortlistPage() {
  const t = await getTranslations("shortlist");
  const shell = await getTranslations("shell");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const items = await apiAuth<Item[]>(`/api/v1/employers/shortlist?lang=${locale}`);
  if (!items) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title={t("empty")}
          text={t("emptyText")}
          action={
            <Link href="/ustalar" className={buttonClass()}>
              {shell("workers")} →
            </Link>
          }
        />
      ) : (
        <CompareList items={items} />
      )}
    </div>
  );
}
