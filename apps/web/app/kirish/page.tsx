import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ royxat?: string }> }) {
  const query = await searchParams;
  return <LoginForm register={query.royxat === "1"} />;
}
