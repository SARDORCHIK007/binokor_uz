import { EmptyState } from "@uychibinokor/ui";
import { readdirSync } from "node:fs";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { HomeExperience } from "@/components/home/HomeExperience";
import { apiGet, type HomePayload } from "@/lib/public";

function realPhotos() {
  try {
    const folder = path.join(process.cwd(), "public", "media", "real");
    return readdirSync(folder).filter((name) => /\.(jpe?g|png|webp|avif)$/i.test(name));
  } catch {
    return [];
  }
}

export async function HomePage() {
  const t = await getTranslations();
  const home = await apiGet<HomePayload>("/api/v1/public/home");
  if (!home) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={t("states.errorTitle")} text={t("states.errorText")} />
      </div>
    );
  }
  return <HomeExperience home={home} photos={realPhotos()} />;
}
