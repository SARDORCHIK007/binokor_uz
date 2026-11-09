import { EmptyState } from "@uychibinokor/ui";
import { getTranslations } from "next-intl/server";
import { PlacementReview, RequestMove } from "@/components/cabinet/JobActions";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

type Board = {
  employers: { id: string; name: string; kind: string; inn: string | null }[];
  requests: { id: string; employer: string; quantity: number; status: string; as_brigade: boolean }[];
  brigades: { id: string; name: string; status: string; members: number }[];
  placements: {
    id: string;
    full_name: string;
    employer: string;
    kind: string;
    review: { quality: number; discipline: number; safety: number; communication: number } | null;
  }[];
};

export default async function JobsPage() {
  const t = await getTranslations("states");
  const board = await apiAuth<Board>("/api/v1/jobs/board");
  if (!board) {
    return <EmptyState title={t("errorTitle")} text={t("errorText")} />;
  }
  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-3xl font-extrabold text-[#071833]">Ishlar</h1>
      <section>
        <h2 className="font-semibold">Ish beruvchilar</h2>
        {board.employers.length === 0 ? (
          <EmptyState title="Ish beruvchi yo'q" text="Hali ro'yxat bo'sh." />
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {board.employers.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[#e5eaf2] bg-white shadow-sm px-4 py-3">
                {item.name} · STIR {item.inn}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-semibold">So'rovlar</h2>
        {board.requests.length === 0 ? (
          <EmptyState title="So'rov yo'q" text="Yangi buyurtma kelmagan." />
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {board.requests.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[#e5eaf2] bg-white shadow-sm px-4 py-3">
                {item.employer} · {item.quantity} kishi · {item.as_brigade ? "brigada" : "alohida"}
                <RequestMove id={item.id} status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-semibold">Brigadalar</h2>
        {board.brigades.length === 0 ? (
          <EmptyState title="Brigada yo'q" text="Hali yig'ilmagan." />
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {board.brigades.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[#e5eaf2] bg-white shadow-sm px-4 py-3">
                {item.name} · {item.members} a'zo · {item.status}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-semibold">Joylashtirish</h2>
        {board.placements.length === 0 ? (
          <EmptyState title="Joylashtirish yo'q" text="Hali ishga biriktirilmagan." />
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {board.placements.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[#e5eaf2] bg-white shadow-sm px-4 py-3">
                {item.full_name} · {item.employer} · {item.kind === "DIRECT" ? "To'g'ridan-to'g'ri" : item.kind}
                {item.review ? (
                  <p className="text-sm text-muted">
                    Sifat {item.review.quality} · intizom {item.review.discipline} · xavfsizlik {item.review.safety} ·
                    muloqot {item.review.communication}
                  </p>
                ) : (
                  <PlacementReview id={item.id} saved={false} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
