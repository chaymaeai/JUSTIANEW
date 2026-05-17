import type { PublicationListItem } from "@/types/publication";
import PublicationCard from "./PublicationCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicationCardSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border",
        isDark ? "border-white/10 bg-[#0b2441]/50" : "border-slate-200 bg-white"
      )}
    >
      <LoadingSkeleton className={cn("aspect-[16/10] w-full rounded-none", isDark ? "bg-white/10" : "bg-slate-200")} />
      <div className="space-y-3 p-5">
        <LoadingSkeleton className={cn("h-3 w-24 rounded-md", isDark ? "bg-white/10" : "bg-slate-200")} />
        <LoadingSkeleton className={cn("h-5 w-full rounded-md", isDark ? "bg-white/10" : "bg-slate-200")} />
        <LoadingSkeleton className={cn("h-4 w-[80%] rounded-md", isDark ? "bg-white/10" : "bg-slate-200")} />
        <LoadingSkeleton className={cn("h-4 w-full rounded-md", isDark ? "bg-white/10" : "bg-slate-200")} />
      </div>
    </div>
  );
}

export interface PublicationGridProps {
  items: PublicationListItem[];
  isDark: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export default function PublicationGrid({ items, isDark, loading, emptyMessage, className }: PublicationGridProps) {
  if (loading) {
    return (
      <div className={cn("grid gap-6 sm:grid-cols-2 xl:grid-cols-3", className)}>
        {[0, 1, 2].map((i) => (
          <PublicationCardSkeleton key={i} isDark={isDark} />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        title={emptyMessage ?? "Aucune publication trouvée"}
        description="Élargissez vos critères ou revenez plus tard pour de nouveaux contenus."
        icon={FileSearch}
        className={cn(
          isDark &&
            "border-white/15 bg-[#0b2441]/40 [&_h3]:text-white [&_p]:text-white/65 [&_svg]:text-[#00B2FF]/80"
        )}
      />
    );
  }

  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {items.map((pub) => (
        <PublicationCard key={pub.id} publication={pub} isDark={isDark} />
      ))}
    </div>
  );
}
