import type { ReactNode } from "react";
import { PAGE } from "@/components/site/PageHeader";

export default function CabinetLayout({ children }: { children: ReactNode }) {
  return <div className={PAGE}>{children}</div>;
}
