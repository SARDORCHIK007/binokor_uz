import { getTranslations } from "next-intl/server";
import { SettingsPanel } from "@/components/cabinet/SettingsPanel";

export const dynamic = "force-dynamic";

const ROLE_IDS = [
  "admin", "mentor", "student", "worker", "employer_local", "producer", "district_official", "employment_officer",
  "agency_officer", "migration_observer", "mahalla_assistant", "university_officer", "employer_foreign", "education_lead",
];

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const roles = await getTranslations("roles");
  const names: Record<string, string> = {};
  for (const id of ROLE_IDS) if (roles.has(id as "admin")) names[id] = roles(id as "admin");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
      <SettingsPanel roleNames={names} />
    </div>
  );
}
