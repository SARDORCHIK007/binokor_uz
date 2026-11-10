"use client";

import { buttonClass } from "@uychibinokor/ui";

/** Opens the browser print dialog, where "Save as PDF" is one click. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className={`${buttonClass({ variant: "secondary" })} print:hidden`} onClick={() => window.print()}>
      🖨 {label}
    </button>
  );
}
