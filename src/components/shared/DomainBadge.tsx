import { cn } from "@/lib/utils";
import { DOMAIN_LABELS } from "@/lib/constants";
import type { DomainJuridique } from "@/types/client";

export interface DomainBadgeProps {
  domain: DomainJuridique;
  className?: string;
}

export function DomainBadge({ domain, className }: DomainBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-md border border-[var(--color-card-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs font-medium text-[var(--color-text)]",
        className
      )}
      title={DOMAIN_LABELS[domain]}
    >
      {DOMAIN_LABELS[domain]}
    </span>
  );
}
