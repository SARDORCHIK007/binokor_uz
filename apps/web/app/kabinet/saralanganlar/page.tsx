import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ActionButton } from "@/components/cabinet/ActionButton";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Item = { slug: string; name: string; level: string; availability: string; rating: number | null; hours: number; trade: string };

export default async function ShortlistPage() {
  const t = await getTranslations("shortlist");
  const w = await getTranslations("workerProfile");
  const shell = await getTranslations("shell");
  const states = await getTranslations("states");
  const items = await apiAuth<Item[]>("/api/v1/employers/shortlist");
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
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.slug} className="rounded-2xl border border-line bg-card p-5 shadow-sh1">
              <p className="text-lg font-bold text-navy-900">{item.name}</p>
              <p className="text-sm font-semibold text-primary">{item.trade}</p>
              <p className="mt-2 text-sm text-muted">
                {w(`levels.${item.level}` as "levels.MASTER")} · {w(`availabilities.${item.availability}` as "availabilities.FREE")} ·{" "}
                {t("hours", { n: item.hours })}
                {item.rating !== null ? ` · ★ ${item.rating.toFixed(1)}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/ustalar/${item.slug}`} className={buttonClass({ variant: "secondary" })}>
                  {t("open")}
                </Link>
                <ActionButton url={`/api/v1/employers/shortlist/${item.slug}`} method="DELETE" label={t("remove")} failed={states("errorTitle")} variant="ghost" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
