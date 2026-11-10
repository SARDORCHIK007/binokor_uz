"use client";

import { useEffect, useRef, useState } from "react";

/** Counts from zero to the real value once it scrolls into view. Shows the final number straight away with reduced motion. */
export function CountUp({ value, locale = "ru-RU", duration = 900 }: { value: number; locale?: string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const node = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    setShown(0);
    let frame = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const target = node.current;
    if (!target || !("IntersectionObserver" in window)) {
      run();
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={node} className="tabular-nums">
      {shown.toLocaleString(locale)}
    </span>
  );
}
