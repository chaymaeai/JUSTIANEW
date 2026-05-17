import { Link } from "react-router-dom";
import { ArrowRight, Clock, Scale } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PublicationListItem } from "@/types/publication";
import { cn } from "@/lib/utils";

export interface FeaturedBannerProps {
  publication: PublicationListItem | null;
}

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function FeaturedBanner({ publication }: FeaturedBannerProps) {
  if (!publication) return null;

  const dateLabel = publication.publishedAt
    ? format(new Date(publication.publishedAt), "d MMMM yyyy", { locale: fr })
    : null;
  const author = publication.authorName.trim() || "JUSTIA";

  return (
    <section className="relative w-full bg-[#001A33] text-white">
      <div className="mx-auto flex min-h-[420px] max-w-7xl flex-col-reverse lg:flex-row">
        {/* Content ~55% */}
        <div className="flex w-full flex-col justify-center px-4 py-10 sm:px-6 sm:py-12 lg:w-[55%] lg:shrink-0 lg:px-8 lg:py-14">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {publication.category && (
              <span
                className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
                style={{
                  backgroundColor: `${publication.category.color}cc`,
                }}
              >
                {publication.category.name}
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              {publication.pubTypeDisplay}
            </span>
          </div>

          <h1 className="font-display text-[38px] font-bold leading-[1.15] tracking-tight text-white line-clamp-2">
            {publication.title}
          </h1>

          <p className="mt-4 line-clamp-3 text-base leading-relaxed text-gray-300">
            {publication.excerpt || publication.subtitle}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white ring-2 ring-[#00B2FF]/40">
                {authorInitials(author)}
              </span>
              <span className="font-medium">{author}</span>
            </div>
            {dateLabel && (
              <>
                <span className="hidden text-white/40 sm:inline" aria-hidden>
                  |
                </span>
                <time dateTime={publication.publishedAt ?? undefined} className="text-white/75">
                  {dateLabel}
                </time>
              </>
            )}
            <span className="hidden text-white/40 sm:inline" aria-hidden>
              |
            </span>
            <span className="inline-flex items-center gap-1 text-white/75">
              <Clock className="h-4 w-4 shrink-0 text-[#00B2FF]" aria-hidden />
              {publication.readingTime} min
            </span>
          </div>

          <div className="mt-8">
            <Link
              to={`/publications/${publication.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#00B2FF] px-7 py-3.5 text-sm font-semibold text-[#001A33] transition-colors hover:bg-cyan-300"
            >
              Lire l&apos;article <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Media ~45% — on mobile: first visually (order) */}
        <div className="relative w-full min-h-[220px] lg:w-[45%] lg:min-h-[420px]">
          <div className="h-full min-h-[220px] p-4 sm:p-6 lg:flex lg:min-h-[420px] lg:items-stretch lg:justify-center lg:py-10">
            {publication.coverImage ? (
              <Link
                to={`/publications/${publication.slug}`}
                className="relative block h-full min-h-[220px] w-full overflow-hidden rounded-2xl lg:min-h-0"
              >
                <img
                  src={publication.coverImage}
                  alt={publication.coverAlt || publication.title}
                  className="h-full min-h-[220px] w-full object-cover lg:min-h-full"
                />
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
              </Link>
            ) : (
              <div
                className={cn(
                  "flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-white/20 px-6 py-10",
                  "bg-gradient-to-br from-white/12 via-white/[0.07] to-transparent backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                )}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00B2FF]/20 text-[#00B2FF] ring-1 ring-[#00B2FF]/35">
                  {publication.category?.icon ? (
                    <span className="text-3xl leading-none" aria-hidden>
                      {publication.category.icon}
                    </span>
                  ) : (
                    <Scale className="h-8 w-8" aria-hidden />
                  )}
                </div>
                <p className="max-w-[220px] text-center text-sm font-medium text-white/70">
                  {publication.category?.name ?? "Publication juridique"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
