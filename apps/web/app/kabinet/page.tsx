import { buttonClass } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

type Me = {
  full_name: string;
  roles: string[];
};

export default async function CabinetPage() {
  const t = await getTranslations("session");
  const token = (await cookies()).get("ub_access")?.value;
  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-3xl font-semibold text-navy-900">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("guest")}</p>
        <Link href="/kirish" className={`${buttonClass()} mt-6`}>
          {t("login")}
        </Link>
      </div>
    );
  }
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://api:8000"}/api/v1/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-3xl font-semibold text-navy-900">{t("title")}</h1>
        <p className="mt-2 text-danger-600">{t("error")}</p>
        <Link href="/kirish" className={`${buttonClass()} mt-6`}>
          {t("login")}
        </Link>
      </div>
    );
  }
  const me = (await response.json()) as Me;
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-3xl font-semibold text-navy-900">{t("title")}</h1>
      <p className="mt-2 text-lg">
        {t("hello")}, {me.full_name}
      </p>
      <p className="mt-4 text-sm text-muted">{t("roles")}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {me.roles.map((role) => (
          <li key={role} className="rounded-sm bg-blue-50 px-3 py-1 text-sm font-medium text-navy-900">
            {role}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <LogoutButton label={t("logout")} />
      </div>
    </div>
  );
}
