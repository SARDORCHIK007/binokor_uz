import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const LOCALES = ["uz-Latn", "uz-Cyrl", "ru", "en"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !LOCALES.includes(locale as (typeof LOCALES)[number])) {
    const stored = (await cookies()).get("ub_locale")?.value;
    locale = LOCALES.includes(stored as (typeof LOCALES)[number]) ? (stored as string) : "uz-Latn";
  }
  return {
    locale: locale as string,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
