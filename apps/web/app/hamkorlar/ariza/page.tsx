import { getTranslations } from "next-intl/server";
import { PartnerRequestForm } from "@/components/panels/PartnerRequestForm";
import { CARD, PAGE, PageHeader } from "@/components/site/PageHeader";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function BecomePartnerPage() {
  const t = await getTranslations("pr");
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  const countries = (home?.destinations ?? []).map((item) => item.code);
  return (
    <div className={PAGE}>
      <PageHeader title={t("title")} text={t("lead")} />
      <ol className="mb-6 grid gap-3 sm:grid-cols-3">
        {(["step1", "step2", "step3"] as const).map((key, index) => (
          <li key={key} className={`${CARD} flex items-start gap-3`}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-white" aria-hidden="true">
              {index + 1}
            </span>
            <span className="pt-1 text-sm font-semibold text-navy-900">{t(key)}</span>
          </li>
        ))}
      </ol>
      <div className="max-w-3xl">
        <PartnerRequestForm countries={countries} />
      </div>
    </div>
  );
}
