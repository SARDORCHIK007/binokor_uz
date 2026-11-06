"use client";

import { EmptyState } from "@uychibinokor/ui";
import { useTranslations } from "next-intl";

export default function CabinetError() {
  const t = useTranslations("cabinet");
  return (
    <div className="p-6">
      <EmptyState title={t("loadError")} text={t("loadErrorText")} />
    </div>
  );
}
