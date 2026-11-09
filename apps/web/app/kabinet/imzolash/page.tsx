import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { SignButton } from "@/components/cabinet/SignButton";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Queue = {
  mine: string[];
  items: {
    number: string;
    holder: string;
    trade: string;
    signers: { slug: string; name: string; signed: boolean }[];
    can_sign: boolean;
  }[];
};

export default async function SigningPage() {
  const t = await getTranslations("signing");
  const states = await getTranslations("states");
  const data = await apiAuth<Queue>("/api/v1/certificates/signing");
  if (!data) {
    return <EmptyState title={states("errorTitle")} text={states("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[66ch] text-muted">{t("text")}</p>
      </div>
      {data.items.length === 0 ? (
        <EmptyState title={t("empty")} text="" />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {data.items.map((item) => (
            <li key={item.number} className="rounded-2xl border border-line bg-card p-4 shadow-sh1">
              <p className="font-bold text-navy-900">{item.holder}</p>
              <p className="text-sm text-muted">
                {item.trade} · <span className="tabular-nums">{item.number}</span>
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {item.signers.map((signer) => (
                  <li key={signer.slug} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-navy-900">{signer.name}</span>
                    {signer.signed ? (
                      <span className="rounded-full bg-success-100 px-2.5 py-1 text-xs font-bold text-success-600">✓ {t("signed")}</span>
                    ) : data.mine.includes(signer.slug) ? (
                      <SignButton number={item.number} partner={signer.slug} name={signer.name} />
                    ) : (
                      <span className="rounded-full bg-warning-100 px-2.5 py-1 text-xs font-bold text-warning-600">{t("awaiting")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
