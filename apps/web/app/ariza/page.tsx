import Link from "next/link";
import { cookies } from "next/headers";
import { ApplicationWizard } from "@/components/apply/ApplicationWizard";
import { Icon } from "@/components/brand/Icon";

export const dynamic = "force-dynamic";

const perks = ["Tez va qulay", "Bepul o'qish", "Sertifikat va QR pasport", "Ishga yo'naltirish"];

export default async function ApplyPage() {
  const token = (await cookies()).get("ub_access")?.value;
  return (
    <div className="min-h-screen bg-[#F4F7FB] py-10">
      <div className="mx-auto max-w-[1060px] px-4">
        <nav aria-label="Yo'l" className="text-sm text-[#5f6b7d]">
          <Link href="/" className="hover:text-[#2F6BFF]">Bosh sahifa</Link>
          <span className="mx-2 text-[#98a2b3]" aria-hidden="true">›</span>
          <span className="font-semibold text-[#071833]">Onlayn ariza</span>
        </nav>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[400px_1fr]">
          <div className="rounded-3xl border border-[#e5eaf2] bg-white p-6 shadow-[0_10px_30px_rgba(7,24,51,0.06)] sm:p-8">
            <div className="flex justify-center">
              <svg viewBox="0 0 160 130" className="h-32 w-44 drop-shadow-md" aria-hidden="true">
                <rect x="25" y="10" width="90" height="110" rx="12" fill="#2F6BFF" />
                <rect x="35" y="24" width="70" height="88" rx="8" fill="#FFFFFF" />
                <rect x="55" y="6" width="30" height="12" rx="4" fill="#13294b" />
                <path d="M44 42l5 5 9-9M44 62l5 5 9-9M44 82l5 5 9-9" stroke="#1f8a4c" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M68 44h26M68 64h26M68 84h26" stroke="#c9d3e3" strokeWidth="4" strokeLinecap="round" />
                <path d="M92 78c0-22 14-36 34-36s34 14 34 36z" fill="#F5B400" />
                <rect x="88" y="76" width="76" height="10" rx="5" fill="#e49f00" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-[#071833]">O&apos;qish uchun onlayn ariza bering</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#5f6b7d]">Ariza 3 qadamda to&apos;ldiriladi. Kursning tavsiya etilgan yo&apos;lini tizim ko&apos;rsatadi, qarorni xodim tasdiqlaydi.</p>
            <ul className="mt-6 space-y-3.5 border-t border-[#e5eaf2] pt-6">
              {perks.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-[#071833]">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#1f8a4c] text-white">
                    <Icon name="check" className="size-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {token ? (
            <ApplicationWizard />
          ) : (
            <div className="rounded-3xl border border-[#e5eaf2] bg-white p-6 shadow-[0_10px_30px_rgba(7,24,51,0.08)] sm:p-8">
              <p className="font-semibold text-[#071833]">Ariza berish uchun avval kiring.</p>
              <p className="mt-1 text-sm text-[#5f6b7d]">Telefon raqamingizga kod yuboriladi.</p>
              <Link href="/kirish" className="mt-4 block rounded-xl bg-[#2F6BFF] px-5 py-3 text-center font-bold text-white hover:bg-[#1f55d6]">
                Kirish
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
