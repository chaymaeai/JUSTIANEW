import { cn } from "@/lib/utils";
import { DEMANDE_STATUS_LABELS } from "@/lib/constants";
import type { DemandeStatus } from "@/types/client";

const tone: Record<DemandeStatus, string> = {
  en_attente: "bg-slate-100 text-slate-700 border-slate-200",
  assignee: "bg-cyan-50 text-cyan-900 border-cyan-200",
  en_cours: "bg-amber-50 text-amber-900 border-amber-200",
  en_revision: "bg-violet-50 text-violet-900 border-violet-200",
  traitee: "bg-emerald-50 text-emerald-900 border-emerald-200",
  annulee: "bg-slate-100 text-slate-500 border-slate-200 line-through",
};

export interface StatusBadgeProps {
  status: DemandeStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tone[status],
        className
      )}
    >
      {DEMANDE_STATUS_LABELS[status]}
    </span>
  );
}
