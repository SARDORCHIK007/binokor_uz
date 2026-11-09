import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteLayoutShell, type ShellUser } from "@/components/site/SiteLayoutShell";
import { CABINET_MENUS } from "@/lib/menus";
import { activeRole, readSession } from "@/lib/session";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
    manifest: "/manifest.webmanifest",
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await readSession();

  let user: ShellUser | null = null;
  if (session) {
    const cabinet = await getTranslations("cabinet");
    const roleNames = await getTranslations("roles");
    const role = await activeRole(session.roles);
    user = {
      name: session.full_name,
      role,
      roles: session.roles.map((id) => ({ id, label: roleNames(id as "admin") })),
      items: (CABINET_MENUS[role] ?? CABINET_MENUS.student).map((item) => ({
        href: item.href,
        label: cabinet(item.key as "panel"),
      })),
    };
  }

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-canvas font-sans text-base text-ink antialiased">
        <NextIntlClientProvider messages={messages}>
          <PwaRegister />
          <SmoothScroll />
          <SiteLayoutShell user={user}>{children}</SiteLayoutShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
