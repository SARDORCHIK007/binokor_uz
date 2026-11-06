import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AttendanceBoard } from "@/components/AttendanceBoard";

export default async function AttendancePage() {
  const t = await getTranslations("attendance");
  return (
    <div>
      <div className="border-b border-line bg-card px-4 py-3">
        <Link href="/kabinet/panel" className="text-sm text-primary">
          ← {t("back")}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {t("group")} · {t("today")}
        </h1>
      </div>
      <AttendanceBoard />
    </div>
  );
}
