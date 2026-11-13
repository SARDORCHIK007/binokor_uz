import { getTranslations } from "next-intl/server";
import { LessonDiary } from "@/components/cabinet/LessonDiaryGate";
import { activeRole, readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  const t = await getTranslations("dy");
  const session = await readSession();
  const role = await activeRole(session?.roles ?? []);
  const teaching = ["mentor", "teacher", "admin", "superadmin"].includes(role);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{t("title")}</h1>
        <p className="mt-2 max-w-[66ch] text-muted">{teaching ? t("mentorText") : t("studentText")}</p>
      </div>
      <LessonDiary teaching={teaching} />
    </div>
  );
}
