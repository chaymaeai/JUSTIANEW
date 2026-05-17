import { Link } from "react-router-dom";
import type { PublicationListItem } from "@/types/publication";
import PublicationCard from "./PublicationCard";
import { cn } from "@/lib/utils";

export interface RelatedPublicationsProps {
  items: PublicationListItem[];
  isDark: boolean;
  /** Max cards to show (default 3) */
  limit?: number;
}

export default function RelatedPublications({ items, isDark, limit = 3 }: RelatedPublicationsProps) {
  const slice = items.slice(0, limit);
  if (!slice.length) return null;

  return (
    <section className="mt-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className={cn("font-['DM_Sans'] text-xl font-bold md:text-2xl", isDark ? "text-white" : "text-[#001A33]")}>
          Publications similaires
        </h2>
        <Link
          to="/publications"
          className="text-sm font-semibold text-[#00B2FF] hover:underline"
        >
          Voir toutes les publications
        </Link>
      </div>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slice.map((pub) => (
          <div key={pub.id} className="w-[min(100%,340px)] shrink-0 snap-start sm:w-[380px]">
            <PublicationCard publication={pub} isDark={isDark} variant="horizontal" className="h-full min-h-[168px]" />
          </div>
        ))}
      </div>
    </section>
  );
}
