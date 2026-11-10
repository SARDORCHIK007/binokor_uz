"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const BTN =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-card px-4 py-2 text-sm font-bold text-navy-900 transition hover:border-primary hover:text-primary";

/** Share a public link: the system share sheet where there is one, otherwise copy and Telegram. */
export function ShareButtons({ path, title, imageUrl }: { path: string; title: string; imageUrl?: string }) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);

  const full = () => (typeof window === "undefined" ? path : new URL(path, window.location.origin).toString());

  async function share() {
    const url = full();
    try {
      if (imageUrl && typeof navigator.canShare === "function") {
        const blob = await (await fetch(imageUrl, { credentials: "include" })).blob();
        const file = new File([blob], "pasport.png", { type: blob.type || "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, url });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      return; // the person closed the share sheet
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(full());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t("copy"), full());
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" className={BTN} onClick={() => void share()}>
        ↗ {t("share")}
      </button>
      <button type="button" className={BTN} onClick={() => void copy()} aria-live="polite">
        {copied ? `✓ ${t("copied")}` : t("copy")}
      </button>
      <a
        className={BTN}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://t.me/share/url?url=${encodeURIComponent(typeof window === "undefined" ? path : full())}&text=${encodeURIComponent(title)}`}
        onClick={(event) => {
          event.currentTarget.href = `https://t.me/share/url?url=${encodeURIComponent(full())}&text=${encodeURIComponent(title)}`;
        }}
      >
        Telegram
      </a>
    </div>
  );
}
