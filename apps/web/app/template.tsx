import type { ReactNode } from "react";

/** A template re-mounts on every navigation, so each page fades in softly. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
