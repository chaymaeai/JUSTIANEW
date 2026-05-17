import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Clock } from "lucide-react";
import type { PublicationCategory, PublicationListItem } from "@/types/publication";
import NewsletterBanner from "./NewsletterBanner";
import { cn } from "@/lib/utils";

export interface TagCount {
  slug: string;
  name: string;
  count: number;
}

export interface PublicationsSidebarProps {
  categories: PublicationCategory[];
  popularTags: TagCount[];
  recent: PublicationListItem[];
  isDark: boolean;
  langPref: string;
  activeCategorySlug: string;
  activeTagSlug: string;
  onCategorySelect: (slug: string) => void;
  onTagSelect: (slug: string) => void;
}

function categoryEmoji(c: PublicationCategory): string {
  if (c.icon?.trim()) return c.icon.trim();
  const s = c.slug.toLowerCase();
  if (s.includes("rgpd") || s.includes("cyber")) return "🔒";
  if (s.includes("ia") || s.includes("ai")) return "🤖";
  if (s.includes("affaires") || s.includes("soci")) return "⚖️";
  if (s.includes("maroc")) return "🇲🇦";
  return "📁";
}

export default function PublicationsSidebar({
  categories,
  popularTags,
  recent,
  isDark,
  langPref,
  activeCategorySlug,
  activeTagSlug,
  onCategorySelect,
  onTagSelect,
}: PublicationsSidebarProps) {
  const panel = cn(
    "rounded-2xl border p-4",
    isDark ? "border-white/10 bg-[#0b2441]/50" : "border-slate-200 bg-white/90"
  );
  const titleCls = cn("mb-3 font-['DM_Sans'] text-xs font-bold uppercase tracking-wider", isDark ? "text-white/55" : "text-slate-500");

  return (
    <div className="flex flex-col gap-6">
      <div className={panel}>
        <h2 className={titleCls}>Catégories</h2>
        <ul className="space-y-1">
          {categories.map((c) => {
            const active = c.slug === activeCategorySlug;
            const count = c.publicationsCount;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onCategorySelect(active ? "" : c.slug)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm transition-colors",
                    active
                      ? isDark
                        ? "bg-[#00B2FF]/20 text-[#00B2FF]"
                        : "bg-[#00B2FF]/15 text-[#001A33]"
                      : isDark
                        ? "text-white/85 hover:bg-white/10"
                        : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-base" aria-hidden>
                      {categoryEmoji(c)}
                    </span>
                    <span className="truncate font-medium">{c.name}</span>
                  </span>
                  {count != null && (
                    <span className={cn("shrink-0 tabular-nums text-xs", isDark ? "text-white/45" : "text-slate-400")}>
                      ({count})
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={panel}>
        <h2 className={titleCls}>Tags populaires</h2>
        <div className="flex flex-wrap gap-2">
          {popularTags.length === 0 ? (
            <p className={cn("text-xs", isDark ? "text-white/45" : "text-slate-500")}>—</p>
          ) : (
            popularTags.map((t) => {
              const active = t.slug === activeTagSlug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => onTagSelect(active ? "" : t.slug)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    active
                      ? "bg-[#00B2FF] text-[#001A33]"
                      : isDark
                        ? "bg-white/10 text-white/80 hover:bg-white/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  #{t.name}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={panel}>
        <h2 className={titleCls}>Dernières publications</h2>
        <ul className="space-y-3">
          {recent.length === 0 ? (
            <li className={cn("text-xs", isDark ? "text-white/45" : "text-slate-500")}>—</li>
          ) : (
            recent.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/publications/${p.slug}`}
                  className={cn(
                    "group block rounded-lg text-sm transition-colors",
                    isDark ? "text-white/90 hover:text-[#00B2FF]" : "text-slate-800 hover:text-[#00B2FF]"
                  )}
                >
                  <span className="line-clamp-2 font-medium leading-snug group-hover:underline">{p.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-white/45">
                    {p.publishedAt && (
                      <time dateTime={p.publishedAt}>{format(new Date(p.publishedAt), "d MMM yyyy", { locale: fr })}</time>
                    )}
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="h-3 w-3" aria-hidden />
                      {p.readingTime} min
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      <div>
        <NewsletterBanner isDark={isDark} langPref={langPref} variant="sidebar" />
      </div>
    </div>
  );
}
