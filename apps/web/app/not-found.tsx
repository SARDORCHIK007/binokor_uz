import { buttonClass } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-7xl font-black tracking-tight text-blue-200 sm:text-8xl" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900">{t("notFoundTitle")}</h1>
      <p className="mt-2 text-muted">{t("notFoundText")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClass({ size: "lg" })}>
          {t("home")}
        </Link>
        <Link href="/qidiruv" className={buttonClass({ size: "lg", variant: "secondary" })}>
          {t("search")}
        </Link>
      </div>
    </div>
  );
}
