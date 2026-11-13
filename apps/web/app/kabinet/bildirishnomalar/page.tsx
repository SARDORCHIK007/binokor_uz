import { EmptyState } from "@uychibinokor/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { ActionButton } from "@/components/cabinet/ActionButton";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Feed = {
  unread: number;
  items: { id: string; kind: string; payload: { accepted?: boolean }; read: boolean; created_at: string }[];
};

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const states = await getTranslations("states");
  const locale = await getLocale();
  const feed = await apiAuth<Feed>("/api/v1/me/notifications");
  if (!feed) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  function message(kind: string, payload: { accepted?: boolean }): string {
    if (kind === "offer") return t("kind.offer");
    if (kind === "offer_answer") return payload.accepted ? t("kind.offer_answer.yes") : t("kind.offer_answer.no");
    if (kind === "invite_accepted") return t("kind.invite_accepted");
    if (kind === "vacancy_new") return t("kind.vacancy_new");
    if (kind === "vacancy_status") return t("kind.vacancy_status");
    if (kind === "lesson_log") return t("kind.lesson_log");
    return t("kind.other");
  }
  function target(kind: string): string {
    if (kind === "invite_accepted") return "/kabinet/taklifnomalar";
    if (kind === "vacancy_new") return "/kabinet/migratsiya";
    if (kind === "vacancy_status") return "/kabinet/vakansiyalar";
    if (kind === "lesson_log") return "/kabinet/kundalik";
    return kind === "offer" ? "/kabinet/takliflar" : kind === "offer_answer" ? "/kabinet/ishberuvchi" : "/kabinet";
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        {feed.unread > 0 ? (
          <ActionButton url="/api/v1/me/notifications/read" label={t("markRead")} failed={states("errorTitle")} variant="secondary" />
        ) : null}
      </div>
      {feed.items.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <ul className="flex flex-col gap-2">
          {feed.items.map((item) => (
            <li key={item.id}>
              <Link
                href={target(item.kind)}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4 transition hover:border-primary ${
                  item.read ? "border-line bg-card" : "border-primary bg-blue-50"
                }`}
              >
                <span className="font-semibold text-navy-900">{message(item.kind, item.payload)}</span>
                <time dateTime={item.created_at} className="text-xs tabular-nums text-muted">
                  {new Date(item.created_at).toLocaleString(locale === "uz-Cyrl" ? "uz-Cyrl-UZ" : locale === "uz-Latn" ? "uz-UZ" : locale)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
