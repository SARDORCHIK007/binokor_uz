"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/site/AppSidebar";
import { AppTopbar } from "@/components/site/AppTopbar";
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
  const nav = useTranslations("nav");

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
        <AppTopbar onToggleSidebar={() => setSidebarOpen(true)} signedIn={user !== null} />
        <main id="asosiy" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
      </div>
      <MobileTabBar signedIn={user !== null} />
    </div>
  );
}
