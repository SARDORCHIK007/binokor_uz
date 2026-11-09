import { getLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1 sm:p-6";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const roleNames = await getTranslations("roles");
  const locale = await getLocale();
  const session = await readSession();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
      <section className={CARD} aria-labelledby="account">
        <h2 id="account" className="text-sm font-bold text-navy-900">{t("account")}</h2>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">{t("name")}</dt>
            <dd className="font-bold text-navy-900">{session?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t("roles")}</dt>
            <dd className="font-bold text-navy-900">{(session?.roles ?? []).map((id) => roleNames(id as "admin")).join(", ") || "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">{t("privacyNote")}</p>
      </section>
      <section className={CARD} aria-labelledby="language">
        <h2 id="language" className="text-sm font-bold text-navy-900">{t("language")}</h2>
        <div className="mt-3 inline-flex rounded-xl bg-navy-900 p-2 text-white" data-current={locale}>
          <LanguageSwitcher />
        </div>
      </section>
    </div>
  );
}
