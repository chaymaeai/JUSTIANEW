import type { PublicationCategory, PublicationLanguage } from "@/types/publication";
import { cn } from "@/lib/utils";

const PUBLICATION_TYPES: { value: string; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "article", label: "Article" },
  { value: "etude", label: "Étude juridique" },
  { value: "bulletin", label: "Bulletin réglementaire" },
  { value: "analyse", label: "Analyse" },
  { value: "guide", label: "Guide pratique" },
  { value: "jurisprudence", label: "Jurisprudence commentée" },
  { value: "rapport", label: "Rapport" },
];

const LANGUAGES: { value: PublicationLanguage | ""; label: string }[] = [
  { value: "", label: "Toutes" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

export interface FilterSidebarProps {
  categories: PublicationCategory[];
  tagOptions: { slug: string; name: string }[];
  categorySlug: string;
  typeSlug: string;
  tagSlug: string;
  language: PublicationLanguage | "";
  isDark: boolean;
  onCategoryChange: (slug: string) => void;
  onTypeChange: (type: string) => void;
  onTagChange: (slug: string) => void;
  onLanguageChange: (lang: PublicationLanguage | "") => void;
  onReset: () => void;
}

export default function FilterSidebar({
  categories,
  tagOptions,
  categorySlug,
  typeSlug,
  tagSlug,
  language,
  isDark,
  onCategoryChange,
  onTypeChange,
  onTagChange,
  onLanguageChange,
  onReset,
}: FilterSidebarProps) {
  const panel = cn(
    "rounded-2xl border p-5",
    isDark ? "border-[#00B2FF]/25 bg-[#0b2441]/60" : "border-slate-200/80 bg-white/80"
  );

  const labelCls = cn("mb-2 block text-xs font-bold uppercase tracking-wider", isDark ? "text-white/50" : "text-slate-500");

  const selectCls = cn(
    "w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF]",
    isDark ? "border-white/20 bg-[#10304f]/80 text-white" : "border-slate-200 bg-white text-slate-900"
  );

  return (
    <aside className="space-y-6 lg:sticky lg:top-28">
      <div className={panel}>
        <h2 className={cn("mb-4 font-['DM_Sans'] text-sm font-bold", isDark ? "text-white" : "text-[#001A33]")}>
          Filtres
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="pub-filter-category" className={labelCls}>
              Catégorie
            </label>
            <select
              id="pub-filter-category"
              value={categorySlug}
              onChange={(e) => onCategoryChange(e.target.value)}
              className={selectCls}
            >
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pub-filter-type" className={labelCls}>
              Type
            </label>
            <select id="pub-filter-type" value={typeSlug} onChange={(e) => onTypeChange(e.target.value)} className={selectCls}>
              {PUBLICATION_TYPES.map((t) => (
                <option key={t.value || "all"} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pub-filter-tag" className={labelCls}>
              Étiquette
            </label>
            <select id="pub-filter-tag" value={tagSlug} onChange={(e) => onTagChange(e.target.value)} className={selectCls}>
              <option value="">Toutes les étiquettes</option>
              {tagOptions.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pub-filter-lang" className={labelCls}>
              Langue
            </label>
            <select
              id="pub-filter-lang"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as PublicationLanguage | "")}
              className={selectCls}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value || "all"} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onReset}
            className={cn(
              "w-full rounded-xl border py-2.5 text-sm font-semibold transition-colors",
              isDark
                ? "border-white/25 text-white/80 hover:border-[#00B2FF] hover:text-[#00B2FF]"
                : "border-slate-200 text-slate-700 hover:border-[#001A33]"
            )}
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </aside>
  );
}
