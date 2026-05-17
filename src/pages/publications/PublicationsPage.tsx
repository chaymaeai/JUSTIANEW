import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import type { PublicationLanguage, PublicationListItem } from "@/types/publication";
import { listCategories, listPublications } from "@/services/publicationService";
import FeaturedBanner from "./components/FeaturedBanner";
import PublicationGrid from "./components/PublicationGrid";
import PublicationsSidebar, { type TagCount } from "./components/PublicationsSidebar";
import { cn } from "@/lib/utils";

type Lang = "fr" | "en" | "ar";

const PAGE_SIZE = 12;

const TYPE_PILLS: { value: string; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "article", label: "Articles" },
  { value: "etude", label: "Études" },
  { value: "bulletin", label: "Bulletins" },
  { value: "analyse", label: "Analyses" },
  { value: "guide", label: "Guides" },
  { value: "jurisprudence", label: "Jurisprudence" },
];

const SORT_OPTIONS: { value: string; ordering: string; label: string }[] = [
  { value: "recent", ordering: "-published_at", label: "Plus récents ↓" },
  { value: "views", ordering: "-views_count", label: "Plus lus" },
  { value: "reading", ordering: "-reading_time", label: "Temps de lecture" },
];

function uniqTags(items: PublicationListItem[]): { slug: string; name: string }[] {
  const m = new Map<string, string>();
  for (const p of items) {
    for (const t of p.tags) {
      if (!m.has(t.slug)) m.set(t.slug, t.name);
    }
  }
  return [...m.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
}

function orderingFromSort(sort: string): string {
  const f = SORT_OPTIONS.find((s) => s.value === sort);
  return f?.ordering ?? "-published_at";
}

type PagePiece = number | "ellipsis";

function buildPagination(current: number, total: number): PagePiece[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(1, current - 2);
  const right = Math.min(total, current + 2);
  const items: PagePiece[] = [];

  if (left > 1) {
    items.push(1);
    if (left > 2) items.push("ellipsis");
  }
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total) {
    if (right < total - 1) items.push("ellipsis");
    items.push(total);
  }
  return items;
}

export default function PublicationsPage() {
  const { isDark, setIsDark } = useTheme();
  const [lang, setLang] = useState<Lang>("fr");
  const [searchParams, setSearchParams] = useSearchParams();

  const categorySlug = searchParams.get("category") ?? "";
  const typeSlug = searchParams.get("type") ?? "";
  const tagSlug = searchParams.get("tag") ?? "";
  const langFilterRaw = searchParams.get("lang") ?? "";
  const langFilter = (langFilterRaw === "fr" || langFilterRaw === "ar" || langFilterRaw === "en" ? langFilterRaw : "") as
    | PublicationLanguage
    | "";
  const search = searchParams.get("q") ?? "";
  const sortRaw = searchParams.get("sort") ?? "recent";
  const sort = SORT_OPTIONS.some((s) => s.value === sortRaw) ? sortRaw : "recent";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const subscribed = searchParams.get("subscribed") === "true";

  const [qInput, setQInput] = useState(search);
  useEffect(() => {
    setQInput(search);
  }, [search]);

  const [categories, setCategories] = useState<Awaited<ReturnType<typeof listCategories>>>([]);
  const [featured, setFeatured] = useState<PublicationListItem | null>(null);
  const [items, setItems] = useState<PublicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [pageCountFromApi, setPageCountFromApi] = useState<number | null>(null);
  const [tagOptions, setTagOptions] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sidebarRecent, setSidebarRecent] = useState<PublicationListItem[]>([]);
  const [popularTags, setPopularTags] = useState<TagCount[]>([]);

  const ordering = orderingFromSort(sort);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await listCategories();
        if (!cancelled) setCategories(cats);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [recentRes, tagRes] = await Promise.all([
          listPublications({ page: 1, pageSize: 5, ordering: "-published_at" }),
          listPublications({ page: 1, pageSize: 48, ordering: "-views_count" }),
        ]);
        if (cancelled) return;
        setSidebarRecent(recentRes.items);
        const counts = new Map<string, { name: string; count: number }>();
        for (const p of tagRes.items) {
          for (const t of p.tags) {
            const cur = counts.get(t.slug) ?? { name: t.name, count: 0 };
            cur.count += 1;
            counts.set(t.slug, cur);
          }
        }
        const top = [...counts.entries()]
          .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 16);
        setPopularTags(top);
      } catch {
        if (!cancelled) {
          setSidebarRecent([]);
          setPopularTags([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [featRes, listRes] = await Promise.all([
          listPublications({ page: 1, pageSize: 1, featured: true }),
          listPublications({
            page,
            pageSize: PAGE_SIZE,
            type: typeSlug || undefined,
            category: categorySlug || undefined,
            tag: tagSlug || undefined,
            language: langFilter || undefined,
            search: search.trim() || undefined,
            ordering,
          }),
        ]);
        if (cancelled) return;
        setFeatured(featRes.items[0] ?? null);
        setItems(listRes.items);
        setTotal(listRes.total);
        setHasNext(listRes.hasNext);
        setHasPrevious(listRes.hasPrevious);
        setPageCountFromApi(typeof listRes.pages === "number" ? listRes.pages : null);
        setTagOptions((prev) => {
          const merged = new Map(prev.map((t) => [t.slug, t.name]));
          for (const t of uniqTags(listRes.items)) {
            merged.set(t.slug, t.name);
          }
          return [...merged.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
        });
      } catch {
        if (!cancelled) {
          setError("Impossible de charger les publications. Vérifiez l’API ou réessayez plus tard.");
          setItems([]);
          setFeatured(null);
          setPageCountFromApi(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, typeSlug, categorySlug, tagSlug, langFilter, search, ordering]);

  const gridItems = useMemo(() => {
    const heroSlug = featured?.slug;
    if (!heroSlug) return items;
    return items.filter((i) => i.slug !== heroSlug);
  }, [items, featured]);

  const totalPages = pageCountFromApi ?? Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageButtons = buildPagination(page, totalPages);

  const categoryLabel = categories.find((c) => c.slug === categorySlug)?.name;
  const typeLabel = TYPE_PILLS.find((t) => t.value === typeSlug)?.label;
  const tagLabel = tagOptions.find((t) => t.slug === tagSlug)?.name ?? popularTags.find((t) => t.slug === tagSlug)?.name;
  const sortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label;

  const langPrefSidebar = langFilter || (lang === "ar" ? "ar" : lang === "en" ? "en" : "fr");

  const chipBtn =
    "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100";

  return (
    <div className={cn("min-h-screen", isDark ? "bg-[#061525]" : "bg-[#f8fafc]")}>
      <Header lang={lang} setLang={setLang} isDark={isDark} setIsDark={setIsDark} />

      <FeaturedBanner publication={featured} />

      {subscribed && (
        <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-800 dark:text-emerald-300">
          Inscription confirmée — merci de votre confiance.
        </div>
      )}

      {/* Sticky filters — white bar, sticks below header */}
      <div
        className="sticky top-[5.5rem] z-30 border-b border-slate-200 bg-white shadow-sm"
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            {/* Row 1 */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <Input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      updateParams({ q: qInput.trim() || undefined, page: undefined });
                    }
                  }}
                  placeholder="Rechercher par titre ou contenu…"
                  aria-label="Rechercher des publications"
                  className="rounded-2xl border-slate-200 pl-10"
                />
              </div>
              <div
                className="flex shrink-0 items-center gap-0 rounded-full border border-slate-200 bg-slate-50 p-1"
                role="group"
                aria-label="Langue des publications"
              >
                {(["fr", "en", "ar"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLang(code);
                      updateParams({
                        lang: langFilter === code ? undefined : code,
                        page: undefined,
                      });
                    }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      langFilter === code ? "bg-[#001A33] text-white" : "text-slate-600 hover:bg-white"
                    )}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2 */}
            <div className="-mx-1 flex flex-col gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TYPE_PILLS.map((pill) => {
                  const active = typeSlug === pill.value;
                  return (
                    <button
                      key={pill.value || "all"}
                      type="button"
                      onClick={() => updateParams({ type: pill.value || undefined, page: undefined })}
                      className={cn(
                        "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                        active ? "bg-[#00B2FF] text-[#001A33]" : "border border-slate-200 bg-white text-slate-700 hover:border-[#00B2FF]/50"
                      )}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex min-w-0 items-center gap-2 sm:max-w-xs">
                  <span className="sr-only">Catégorie</span>
                  <select
                    value={categorySlug}
                    onChange={(e) => updateParams({ category: e.target.value || undefined, page: undefined })}
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF]"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Tri">
                  {SORT_OPTIONS.map((opt) => {
                    const active = sort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateParams({ sort: opt.value === "recent" ? undefined : opt.value, page: undefined })}
                        className={cn(
                          "rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                          active ? "bg-[#001A33] text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Active filters */}
            {(search || langFilter || typeSlug || categorySlug || tagSlug || sort !== "recent") && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-medium text-slate-500">Filtres :</span>
                {search ? (
                  <button type="button" className={chipBtn} onClick={() => updateParams({ q: undefined, page: undefined })}>
                    {search} <X className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  </button>
                ) : null}
                {langFilter ? (
                  <button
                    type="button"
                    className={chipBtn}
                    onClick={() => updateParams({ lang: undefined, page: undefined })}
                  >
                    {langFilter.toUpperCase()} <X className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  </button>
                ) : null}
                {typeSlug && typeLabel ? (
                  <button
                    type="button"
                    className={chipBtn}
                    onClick={() => updateParams({ type: undefined, page: undefined })}
                  >
                    {typeLabel} <X className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  </button>
                ) : null}
                {categorySlug && categoryLabel ? (
                  <button
                    type="button"
                    className={chipBtn}
                    onClick={() => updateParams({ category: undefined, page: undefined })}
                  >
                    {categoryLabel} <X className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  </button>
                ) : null}
                {tagSlug && tagLabel ? (
                  <button type="button" className={chipBtn} onClick={() => updateParams({ tag: undefined, page: undefined })}>
                    #{tagLabel} <X className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  </button>
                ) : null}
                {sort !== "recent" && sortLabel ? (
                  <button type="button" className={chipBtn} onClick={() => updateParams({ sort: undefined, page: undefined })}>
                    {sortLabel} <X className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <p className="mb-8 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 flex-1 lg:basis-[70%]">
            <PublicationGrid
              items={gridItems}
              isDark={isDark}
              loading={loading}
              emptyMessage="Aucune publication trouvée"
            />

            {totalPages > 1 && !loading && gridItems.length > 0 && (
              <nav
                className="mt-12 flex flex-col items-center gap-4 border-t border-slate-200/80 pt-10 dark:border-white/10"
                aria-label="Pagination"
              >
                <p className={cn("text-sm", isDark ? "text-white/60" : "text-slate-600")}>
                  Page {page} sur {totalPages} — {total} publication{total > 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  <button
                    type="button"
                    disabled={!hasPrevious || page <= 1}
                    onClick={() => updateParams({ page: page > 2 ? String(page - 1) : undefined })}
                    aria-label="Page précédente"
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-35",
                      isDark
                        ? "border-white/20 text-white hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  {pageButtons.map((piece, idx) =>
                    piece === "ellipsis" ? (
                      <span
                        key={`e-${idx}`}
                        className={cn("px-2 text-sm", isDark ? "text-white/45" : "text-slate-400")}
                        aria-hidden
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={piece}
                        type="button"
                        onClick={() =>
                          updateParams({
                            page: piece === 1 ? undefined : String(piece),
                          })
                        }
                        className={cn(
                          "inline-flex min-w-[2.5rem] items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                          page === piece
                            ? "bg-[#00B2FF] text-[#001A33]"
                            : isDark
                              ? "text-white/75 hover:bg-white/10"
                              : "text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        {piece}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => updateParams({ page: String(page + 1) })}
                    aria-label="Page suivante"
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:opacity-35",
                      isDark
                        ? "border-white/20 text-white hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </nav>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 lg:w-[30%] lg:max-w-[360px] lg:shrink-0 lg:self-start">
            <PublicationsSidebar
              categories={categories}
              popularTags={popularTags}
              recent={sidebarRecent}
              isDark={isDark}
              langPref={langPrefSidebar}
              activeCategorySlug={categorySlug}
              activeTagSlug={tagSlug}
              onCategorySelect={(slug) => updateParams({ category: slug || undefined, page: undefined })}
              onTagSelect={(slug) => updateParams({ tag: slug || undefined, page: undefined })}
            />
          </aside>
        </div>
      </main>

      <Footer lang={lang} isDark={isDark} />
    </div>
  );
}
