import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ApplicationWizard } from "@/components/apply/ApplicationWizard";
import { Icon } from "@/components/brand/Icon";
import { PAGE } from "@/components/site/PageHeader";

export const dynamic = "force-dynamic";


export default async function ApplyPage() {
  const token = (await cookies()).get("ub_access")?.value;
  const t = await getTranslations("applyPage");
  const shell = await getTranslations("shell");
  const perks = [t("perk1"), t("perk2"), t("perk3"), t("perk4")];
  return (
    <div className={PAGE}>
      <div>
        <nav aria-label="breadcrumb" className="text-sm text-muted">
          <Link href="/" className="hover:text-primary">{shell("home")}</Link>
          <span className="mx-2 text-faint" aria-hidden="true">›</span>
          <span className="font-semibold text-navy-900">{t("crumb")}</span>
        </nav>
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[380px_1fr]">
          <div className="rounded-2xl border border-line bg-card p-6 shadow-sh2 sm:p-8">
            <div className="flex justify-center">
              <svg viewBox="0 0 160 130" className="h-32 w-44 drop-shadow-md" aria-hidden="true">
                <rect x="25" y="10" width="90" height="110" rx="12" fill="#2F6BFF" />
                <rect x="35" y="24" width="70" height="88" rx="8" fill="#FFFFFF" />
                <rect x="55" y="6" width="30" height="12" rx="4" fill="#13294b" />
                <path d="M44 42l5 5 9-9M44 62l5 5 9-9M44 82l5 5 9-9" stroke="#1f8a4c" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M68 44h26M68 64h26M68 84h26" stroke="#c9d3e3" strokeWidth="4" strokeLinecap="round" />
                <path d="M92 78c0-22 14-36 34-36s34 14 34 36z" fill="#F5B400" />
                <rect x="88" y="76" width="76" height="10" rx="5" fill="#e49f00" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-navy-900">{t("title")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("text")}</p>
            <ul className="mt-6 space-y-3.5 border-t border-line pt-6">
              {perks.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-navy-900">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success-600 text-white">
                    <Icon name="check" className="size-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {token ? (
            <ApplicationWizard />
          ) : (
            <div className="rounded-2xl border border-line bg-card p-6 shadow-sh2 sm:p-8">
              <p className="font-semibold text-navy-900">{t("loginFirst")}</p>
              <p className="mt-1 text-sm text-muted">{t("loginText")}</p>
              <Link href="/kirish" className="mt-4 block rounded-xl bg-primary px-5 py-3 text-center font-bold text-white hover:bg-primary-hover">
                {shell("login")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
