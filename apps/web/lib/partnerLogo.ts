import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Logo files are placed by the project owner in public/media/partners/<slug>.*; a logo is shown when
 * its file exists. BR-15 (signed agreement + written permission) is tracked in docs/reports/questions.md.
 */
export function partnerLogo(slug: string | null): string | null {
  if (!slug) {
    return null;
  }
  for (const ext of ["webp", "png", "svg"]) {
    if (existsSync(path.join(process.cwd(), "public", "media", "partners", `${slug}.${ext}`))) {
      return `/media/partners/${slug}.${ext}`;
    }
  }
  return null;
}
