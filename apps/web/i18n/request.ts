import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const LOCALES = ["uz-Latn", "uz-Cyrl", "ru", "en"] as const;

export default getRequestConfig(async () => {
  const stored = (await cookies()).get("ub_locale")?.value;
  const locale = LOCALES.includes(stored as (typeof LOCALES)[number]) ? stored : "uz-Latn";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
