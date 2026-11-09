"use client";

import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    // Brauzerning standart silliq scrolli
    if (typeof document !== "undefined") {
      document.documentElement.style.scrollBehavior = "smooth";
    }
  }, []);

  return null;
}
