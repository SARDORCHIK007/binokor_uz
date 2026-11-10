"use client";

import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/site/AppSidebar";
import { AppTopbar } from "@/components/site/AppTopbar";
import { OnboardingTracker } from "@/components/cabinet/OnboardingGuide";
import { CommandPalette } from "@/components/site/CommandPalette";
import { BackLink } from "@/components/site/BackLink";
import { MobileTabBar } from "@/components/site/MobileTabBar";
import { SiteFooter } from "@/components/SiteFooter";

export type ShellUser = {
  name: string;
  role: string;
  roles: { id: string; label: string }[];
  items: { href: string; label: string }[];
};

export function SiteLayoutShell({ children, user }: { children: ReactNode; user: ShellUser | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const nav = useTranslations("nav");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-navy-900">
      <a
        href="#asosiy"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {nav("skip")}
      </a>
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      <div className="flex min-h-screen flex-col pb-16 lg:pb-0 lg:pl-72">
        <AppTopbar onToggleSidebar={() => setSidebarOpen(true)} onSearch={() => setPaletteOpen(true)} signedIn={user !== null} />
        {user ? <OnboardingTracker role={user.role} /> : null}
        <CommandPalette user={user} open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <main id="asosiy" tabIndex={-1} className="flex-1 focus:outline-none">
          <Suspense fallback={null}>
            <BackLink />
          </Suspense>
          {children}
        </main>
        <SiteFooter />
      </div>
      <MobileTabBar signedIn={user !== null} />
    </div>
  );
}
