import type { ReactNode } from "react";

export default function CabinetLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1400px] p-3 sm:p-6">{children}</div>;
}
