import { cn } from "@/lib/utils";
import type { UrgencyLevel } from "@/lib/constants";

const colors: Record<UrgencyLevel, { bar: string; dot: string; label: string }> = {
  normale: {
    bar: "bg-slate-300",
    dot: "bg-slate-400",
    label: "text-slate-600",
  },
  urgente: {
    bar: "bg-amber-400",
    dot: "bg-amber-500",
    label: "text-amber-800",
  },
  critique: {
    bar: "bg-red-500",
    dot: "bg-red-600",
    label: "text-red-800",
  },
};

export interface UrgencyIndicatorProps {
  level: UrgencyLevel;
  variant?: "dot" | "bar" | "both";
  showLabel?: boolean;
  className?: string;
}

const labels: Record<UrgencyLevel, string> = {
  normale: "Normale",
  urgente: "Urgente",
  critique: "Critique",
};

export function UrgencyIndicator({ level, variant = "both", showLabel = false, className }: UrgencyIndicatorProps) {
  const c = colors[level];
  return (
    <div className={cn("flex items-center gap-2", className)} title={labels[level]}>
      {(variant === "dot" || variant === "both") && (
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", c.dot)} aria-hidden />
      )}
      {(variant === "bar" || variant === "both") && (
        <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn("h-full rounded-full transition-all", c.bar)}
            style={{ width: level === "normale" ? "33%" : level === "urgente" ? "66%" : "100%" }}
          />
        </div>
      )}
      {showLabel && <span className={cn("text-xs font-medium", c.label)}>{labels[level]}</span>}
    </div>
  );
}
