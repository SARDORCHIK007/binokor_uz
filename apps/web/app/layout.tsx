import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

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
  const nav = await getTranslations("nav");
  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-screen bg-canvas font-sans text-base text-ink antialiased">
        <a href="#asosiy" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-3">
          {nav("skip")}
        </a>
        <NextIntlClientProvider messages={messages}>
          <PwaRegister />
          <SiteHeader />
          <main id="asosiy">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
