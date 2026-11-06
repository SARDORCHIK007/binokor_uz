export async function apiGet<T>(path: string): Promise<T | null> {
  const base = process.env.API_INTERNAL_URL ?? "http://api:8000";
  const { cookies } = await import("next/headers");
  const locale = (await cookies()).get("ub_locale")?.value ?? "uz-Latn";
  try {
    const response = await fetch(`${base}${path}`, {
      cache: "no-store",
      headers: { "X-Locale": locale },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export type HomePayload = {
  stats: Partial<{ listeners: number; certified: number; employed: number; sites: number }>;
  trades: { code: string; name: string; domestic_months: number; foreign_lang_months: number }[];
  destinations: { code: string; name: string; language: string; notes: string }[];
  partners: { name: string; status: "SIGNED" | "NEGOTIATING" | "PLANNED" | "ENDED"; show_logo: boolean }[];
};
