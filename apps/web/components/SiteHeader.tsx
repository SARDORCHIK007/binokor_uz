import { HeaderClient } from "@/components/site/HeaderClient";
import { readSession } from "@/lib/session";

export async function SiteHeader() {
  const session = await readSession();
  return <HeaderClient name={session?.full_name ?? null} />;
}
