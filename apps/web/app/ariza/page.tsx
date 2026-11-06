import Link from "next/link";
import { cookies } from "next/headers";
import { buttonClass } from "@uychibinokor/ui";
import { ApplicationWizard } from "@/components/apply/ApplicationWizard";

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const token = (await cookies()).get("ub_access")?.value;
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 text-3xl font-semibold text-navy-900">Ariza</h1>
      {token ? (
        <ApplicationWizard />
      ) : (
        <div className="rounded-md border border-line bg-card p-5">
          <p>Ariza berish uchun avval kiring.</p>
          <Link href="/kirish" className={`${buttonClass()} mt-4`}>
            Kirish
          </Link>
        </div>
      )}
    </div>
  );
}
