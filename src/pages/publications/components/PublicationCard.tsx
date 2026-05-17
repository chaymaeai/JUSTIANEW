import { Link } from "react-router-dom";
import { Clock, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PublicationListItem } from "@/types/publication";
import { getMediaUrl } from "@/utils/media";
import { cn } from "@/lib/utils";

export interface PublicationCardProps {
  publication: PublicationListItem;
  isDark: boolean;
  className?: string;
  variant?: "vertical" | "horizontal";
}

export default function PublicationCard({ publication, isDark, className, variant = "vertical" }: PublicationCardProps) {
  const dateLabel = publication.publishedAt
    ? format(new Date(publication.publishedAt), "d MMM yyyy", { locale: fr })
    : null;

  const layoutHorizontal = variant === "horizontal";
  const coverSrc = getMediaUrl(publication.coverImage);

  return (
    <article
      className={cn(
        "group flex h-full overflow-hidden rounded-2xl border transition-all duration-300",
        layoutHorizontal ? "flex-col sm:flex-row" : "flex-col",
        isDark
          ? "border-[#00B2FF]/25 bg-gradient-to-br from-[#0b2441]/90 to-[#10304f]/80 hover:border-[#00B2FF]/50"
          : "border-slate-200/80 bg-white/90 shadow-sm hover:border-[#00B2FF]/40 hover:shadow-md",
        className
      )}
    >
      <Link
        to={`/publications/${publication.slug}`}
        className={cn(
          "relative block overflow-hidden",
          layoutHorizontal ? "aspect-[16/10] shrink-0 sm:aspect-auto sm:h-auto sm:w-[44%] sm:min-h-[168px]" : "aspect-[16/10]"
        )}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={publication.coverAlt || publication.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-end justify-start p-5"
            style={{
              background: `linear-gradient(135deg, ${publication.category?.color ?? "#00B2FF"}33 0%, #001A33 100%)`,
            }}
          >
            <FileText className={cn("h-10 w-10", isDark ? "text-white/80" : "text-[#001A33]/70")} aria-hidden />
          </div>
        )}
        {publication.isFeatured && (
          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              isDark ? "bg-[#00B2FF] text-[#001A33]" : "bg-white/95 text-[#001A33] shadow"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> À la une
          </span>
        )}
      </Link>
      <div className={cn("flex flex-1 flex-col p-5", layoutHorizontal && "sm:min-w-0 sm:justify-center")}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium">
          {publication.category && (
            <span
              className="rounded-full px-2.5 py-0.5"
              style={{
                backgroundColor: `${publication.category.color}22`,
                color: publication.category.color,
              }}
            >
              {publication.category.name}
            </span>
          )}
          <span className={isDark ? "text-white/50" : "text-slate-500"}>{publication.pubTypeDisplay}</span>
        </div>
        <h2 className="mb-2 font-['DM_Sans'] text-lg font-semibold leading-snug tracking-tight">
          <Link
            to={`/publications/${publication.slug}`}
            className={cn(
              "transition-colors",
              isDark ? "text-white hover:text-[#00B2FF]" : "text-[#001A33] hover:text-[#00B2FF]"
            )}
          >
            {publication.title}
          </Link>
        </h2>
        {publication.subtitle ? (
          <p className={cn("mb-3 line-clamp-2 text-sm", isDark ? "text-white/65" : "text-slate-600")}>
            {publication.subtitle}
          </p>
        ) : (
          <p className={cn("mb-3 line-clamp-3 text-sm", isDark ? "text-white/65" : "text-slate-600")}>
            {publication.excerpt}
          </p>
        )}
        <div
          className={cn(
            "mt-auto flex flex-wrap items-center gap-3 border-t pt-3 text-xs",
            isDark ? "border-white/10 text-white/55" : "border-slate-100 text-slate-500"
          )}
        >
          {dateLabel && <time dateTime={publication.publishedAt ?? undefined}>{dateLabel}</time>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {publication.readingTime} min
          </span>
          {publication.hasPdf && (
            <span className="inline-flex items-center gap-1 font-medium text-[#00B2FF]">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              PDF
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
