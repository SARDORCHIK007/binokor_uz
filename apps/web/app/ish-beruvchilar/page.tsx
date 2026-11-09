import Link from "next/link";
import { Icon } from "@/components/brand/Icon";
import { apiGet, type HomePayload } from "@/lib/public";

export const dynamic = "force-dynamic";

type WorkerRow = { slug: string; name: string; trade: string; level: string; availability: string; rating: number | null; hours: number };
type Brigade = { id: string; name: string; trade: string; status: string; members: number };

const LEVELS: Record<string, string> = { ASSISTANT: "Assistant", INDEPENDENT: "Independent", MASTER: "Master", BRIGADIER: "Brigadier" };

export default async function EmployersPortalPage() {
  const [home, workers, brigades] = await Promise.all([
    apiGet<HomePayload>("/api/v1/public/home"),
    apiGet<WorkerRow[]>("/api/v1/public/workers"),
    apiGet<Brigade[]>("/api/v1/public/brigades"),
  ]);
  const stats = [
    ["Certified workers", home?.stats.certified],
    ["Foreign employers", home?.stats.foreign_employers],
    ["Trades", home?.trades.length],
  ] as const;

  return (
    <div className="min-h-screen bg-canvas text-navy-900">
      <section className="relative overflow-hidden bg-navy-900 py-16 text-white lg:py-20">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden opacity-60 lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/misc/building-apartment.jpg" alt="" className="h-full w-full object-cover object-center" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-900/95 to-navy-900/30" />
        <div className="relative mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <span className="inline-block rounded-full bg-navy-800 px-3.5 py-1 text-xs font-semibold text-accent ring-1 ring-accent/30">
              Employers (EN)
            </span>
            <h1 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Find verified construction professionals from Uzbekistan
            </h1>
            <ul className="mt-6 space-y-3">
              {["Certificates verified by QR", "Ready-to-work brigades", "Candidates shown without contact details", "No fees for candidates"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-semibold text-white/95 sm:text-base">
                  <span className="grid size-5 place-items-center rounded-full bg-success-600 text-white">
                    <Icon name="check" className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/kirish" className="rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-navy-900 shadow-lg hover:bg-accent-hover">
                Employer sign in →
              </Link>
              <a href="#candidates" className="rounded-xl border border-white/40 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10">
                Browse candidates
              </a>
            </div>
          </div>
          <dl className="mt-12 grid grid-cols-3 gap-4 rounded-2xl bg-[#0b1f3a] p-5 ring-1 ring-white/10">
            {stats.map(([label, value]) => (
              <div key={label}>
                <dd className="text-3xl font-extrabold tabular-nums">{value ?? 0}</dd>
                <dt className="mt-1 text-xs text-faint">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="border-y border-[#d0dfff] bg-blue-50 px-4 py-3 text-center text-xs font-medium text-[#1e3a8a]">
        Foreign recruitment is organised only through the Agency for External Labor Migration and its licensed partners. Candidates are never charged.
      </div>

      <section id="candidates" className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Candidates</h2>
        <p className="mt-1 text-sm text-muted">Phone numbers and personal documents are never shown. Contact goes through the placement manager.</p>
        {!workers ? (
          <p className="mt-6 rounded-2xl bg-white p-6 text-sm text-muted">The list could not be loaded. Please try again later.</p>
        ) : workers.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-white p-6 text-sm text-muted">No candidates yet.</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workers.slice(0, 9).map((worker) => (
              <li key={worker.slug}>
                <Link href={`/ustalar/${worker.slug}`} className="block h-full rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:border-primary">
                  <p className="font-extrabold">{worker.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {worker.trade} · {LEVELS[worker.level] ?? worker.level}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {worker.hours} verified hours · {worker.rating === null ? "no rating" : `${worker.rating.toFixed(1)} / 5`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-16">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Brigades</h2>
        {!brigades || brigades.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-muted">No ready brigades yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {brigades.map((brigade) => (
              <li key={brigade.id} className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                <p className="font-extrabold">{brigade.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {brigade.trade} · {brigade.members} members
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
