"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Small "back" link at the top of the page content. It shows only inside a section: on a detail page
 * (/kasblar/plumber, /ustalar/ali, /kabinet/x/y) or on a filtered list (/ustalar?trade=plumber),
 * never on a top-level page such as /ustalar or /kabinet/pasport.
 */
export function BackLink() {
  const t = useTranslations("shell");
  const path = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  const segments = path.split("/").filter(Boolean);
  const depth = segments.length - (segments[0] === "kabinet" ? 1 : 0);
  const filtered = params.toString().length > 0 && segments.length > 0 && segments[0] !== "kabinet";
  if (depth < 2 && !filtered) return null;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:bg-blue-100 hover:text-primary"
      >
        <span aria-hidden="true">←</span>
        {t("back")}
      </button>
    </div>
  );
}
