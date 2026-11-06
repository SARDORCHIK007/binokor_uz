import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-t border-line bg-navy-900 text-blue-50">
      <div className="mx-auto grid max-w-[1200px] gap-3 px-4 py-10 text-sm sm:grid-cols-3">
        <p className="font-semibold text-white">UYCHI BINOKOR</p>
        <p>{t("contact")}</p>
        <div className="space-y-2">
          <p>{t("trust")}</p>
          <p className="text-blue-100">{t("privacy")}</p>
        </div>
      </div>
    </footer>
  );
}
