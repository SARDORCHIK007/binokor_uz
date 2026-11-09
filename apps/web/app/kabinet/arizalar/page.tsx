import { EmptyState } from "@uychibinokor/ui";
import { cookies } from "next/headers";
import { DecisionButtons } from "@/components/apply/DecisionButtons";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  status: string;
  matrix: string;
  type: string;
  name: string;
  trade: string;
};

export default async function AdminApplicationsPage() {
  const token = (await cookies()).get("ub_access")?.value;
  if (!token) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title="Kirish kerak" text="Admin raqami bilan kiring." />
      </div>
    );
  }
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://api:8000"}/api/v1/admin/applications`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title="Ro'yxat ochilmadi" text="Admin huquqi kerak." />
      </div>
    );
  }
  const rows = (await response.json()) as Row[];
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Arizalar</h1>
      {rows.length === 0 ? (
        <p className="mt-4 text-muted">Hozircha ariza yo&apos;q.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-card shadow-sh1 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-sm text-muted">
                    {row.trade} · {row.type} · {row.status} · {row.matrix}
                  </p>
                </div>
                <DecisionButtons id={row.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
