import { buttonClass, EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function SoonPage() {
  const t = await getTranslations("soon");
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <EmptyState
        title={t("title")}
        text={t("text")}
        action={
          <Link href="/" className={buttonClass({ variant: "secondary" })}>
            {t("back")}
          </Link>
        }
      />
    </div>
  );
}
