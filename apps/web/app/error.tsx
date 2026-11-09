"use client";

import { EmptyState, buttonClass } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";

export default function PageError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("states");
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <EmptyState
        title={t("errorTitle")}
        text={t("errorText")}
        action={
          <button type="button" onClick={reset} className={buttonClass()}>
            {t("retry")}
          </button>
        }
      />
    </div>
  );
}
