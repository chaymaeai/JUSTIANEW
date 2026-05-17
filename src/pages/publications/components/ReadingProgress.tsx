import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface ReadingProgressProps {
  targetRef: RefObject<HTMLDivElement | null>;
  isDark: boolean;
}

/**
 * Thin fixed bar under the header reflecting scroll progress through the article body.
 */
export default function ReadingProgress({ targetRef, isDark }: ReadingProgressProps) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    function update() {
      const node = targetRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const h = node.offsetHeight;
      const win = window.innerHeight;
      const readable = Math.max(1, h - win);
      const progress = (-rect.top / readable) * 100;
      setPct(Math.min(100, Math.max(0, progress)));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetRef]);

  return (
    <div
      className={cn("fixed left-0 right-0 top-0 z-50 h-1", isDark ? "bg-white/5" : "bg-black/5")}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-[#00B2FF] transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
