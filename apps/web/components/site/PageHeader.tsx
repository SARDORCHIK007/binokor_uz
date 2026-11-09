import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Shared page width + padding so every public page lines up with the topbar. */
export const PAGE = "mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10";

/** Shared card surface. */
export const CARD = "rounded-2xl border border-line bg-card p-5 shadow-sh1";
export const CARD_LINK = `${CARD} block transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sh2`;

/** Shared form control. */
export const FIELD =
  "min-h-11 w-full rounded-xl border border-line-strong bg-card px-3.5 text-sm text-navy-900 placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";

export async function PageHeader({
  title,
  text,
  eyebrow,
  actions,
}: {
  title: string;
  text?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  const nav = await getTranslations("nav");
  return (
    <header className="mb-8">
      <nav aria-label="breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">
          {nav("home")}
        </Link>
        <span className="mx-2 text-faint" aria-hidden="true">
          ›
        </span>
        <span className="font-semibold text-navy-900">{title}</span>
      </nav>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold tracking-wider text-primary uppercase">{eyebrow}</p> : null}
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">{title}</h1>
          {text ? <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">{text}</p> : null}
        </div>
        {actions}
      </div>
    </header>
  );
}

/** Pill-style filter links (status / category tabs). */
export function FilterTabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            item.active
              ? "border-primary bg-primary text-white"
              : "border-line bg-card text-navy-900 hover:border-primary hover:text-primary"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function ErrorPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-xl px-4 py-16">{children}</div>;
}
