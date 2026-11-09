"use client";

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

  return (
    <div className="min-h-screen bg-canvas text-navy-900">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
      <div className="flex min-h-screen flex-col pb-16 lg:pb-0 lg:pl-72">
        <AppTopbar onToggleSidebar={() => setSidebarOpen(true)} />
        <main id="asosiy" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
      <MobileTabBar signedIn={user !== null} />
    </div>
  );
}
