import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { CabinetShell } from "@/components/cabinet/CabinetShell";
import { activeRole, readSession } from "@/lib/session";

const MENUS: Record<string, { href: string; key: string }[]> = {
  admin: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/arizalar", key: "applications" },
    { href: "/kabinet/kurslar", key: "courses" },
    { href: "/kabinet/guruhlar", key: "groups" },
    { href: "/kabinet/foydalanuvchilar", key: "users" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
    { href: "/kabinet/lugat", key: "vocab" },
    { href: "/kabinet/ishlar", key: "jobs" },
    { href: "/kabinet/hisobot", key: "reports" },
  ],
  education_lead: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
  ],
  cert_officer: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/sertifikatlar", key: "certificates" },
  ],
  mentor: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/guruhlar", key: "groups" },
    { href: "/kabinet/davomat", key: "attendance" },
    { href: "/kabinet/baholar", key: "grades" },
  ],
  curator: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/kurator", key: "curator" },
    { href: "/kabinet/lugat", key: "vocab" },
  ],
  student: [
    { href: "/kabinet", key: "panel" },
    { href: "/kabinet/davomat", key: "attendance" },
    { href: "/kabinet/baholar", key: "grades" },
    { href: "/kabinet/imtihon", key: "exam" },
    { href: "/kabinet/arizam", key: "myApplication" },
    { href: "/kabinet/lugat", key: "vocab" },
    { href: "/ariza", key: "apply" },
  ],
};

export default async function CabinetLayout({ children }: { children: ReactNode }) {
  const session = await readSession();
  if (!session) {
    return children;
  }
  const role = await activeRole(session.roles);
  const t = await getTranslations("cabinet");
  const items = (MENUS[role] ?? MENUS.student).map((item) => ({
    href: item.href,
    label: t(item.key as "panel"),
  }));
  return (
    <CabinetShell role={role} roles={session.roles} items={items}>
      {children}
    </CabinetShell>
  );
}
