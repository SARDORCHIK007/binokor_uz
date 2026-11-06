"use client";

import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let frame = 0;
    let stop = false;
    let destroy = () => {};
    void import("lenis").then(({ default: Lenis }) => {
      if (stop) {
        return;
      }
      const lenis = new Lenis({ duration: 1.05 });
      destroy = () => lenis.destroy();
      const loop = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    });
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      destroy();
    };
  }, []);
  return null;
}
