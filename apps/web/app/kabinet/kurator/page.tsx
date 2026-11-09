import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Member = { name: string; learned: number; total: number; last_answer_at: string | null };

export default async function CuratorPage() {
  const t = await getTranslations("states");
  const members = await apiAuth<Member[]>("/api/v1/curator/group");
  if (!members) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }
  if (members.length === 0) {
    return <EmptyState title="Guruh yo'q" text="Kuratorga tinglovchi biriktirilmagan." />;
  }
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Kurator</h1>
      <p className="mt-1 text-sm text-muted">Nemis tili, 5-qutidagi so&apos;zlar</p>
      <ul className="mt-4 flex flex-col gap-2">
        {members.map((member) => (
          <li key={member.name} className="rounded-2xl border border-line bg-card shadow-sh1 px-4 py-3">
            {member.name} · {member.learned}/{member.total}
            {member.last_answer_at ? ` · ${member.last_answer_at.slice(0, 10)}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
