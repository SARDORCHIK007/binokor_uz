"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const home = useTranslations("home");
  const path = usePathname();
  if (path.startsWith("/kabinet")) {
    return null;
  }
  return (
    <footer className="bg-[#071833] text-blue-50">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-14 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">{t("trust")}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/kasblar">{nav("trades")}</Link>
          <Link href="/ustalar">{nav("workers")}</Link>
          <Link href="/ariza">{home("apply")}</Link>
          <Link href="/aloqa">{nav("contact")}</Link>
        </div>
        <div className="space-y-2 text-sm text-blue-100">
          <p>{t("contact")}</p>
          <p>{t("privacy")}</p>
        </div>
      </div>
    </footer>
  );
}
