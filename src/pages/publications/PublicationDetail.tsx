import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BookMarked,
  BookOpen,
  ChevronRight,
  FileText,
  Gavel,
  Lock,
  Newspaper,
  Scale,
  ScrollText,
  ThumbsDown,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import type { PublicationDetail as PublicationDetailType, PublicationListItem, PublicationPubType } from "@/types/publication";
import { getPublicationBySlug, getPublicationPdfUrl, getRelatedPublications, resolveMediaUrl } from "@/services/publicationService";
import { cn, firstWords, htmlToPlainText } from "@/lib/utils";
import ReadingProgress from "./components/ReadingProgress";
import ShareButtons from "./components/ShareButtons";
import CommentSection from "./components/CommentSection";
import RelatedPublications from "./components/RelatedPublications";
import NewsletterBanner from "./components/NewsletterBanner";

type Lang = "fr" | "en" | "ar";

const PREVIEW_WORDS = 300;

const SITE_DEFAULT_DESCRIPTION =
  "JUSTIA - Plateforme LegalTech pour conseil juridique, conformité RGPD & IA, et solutions intelligentes";

function truncateSeoDescription(raw: string, max = 160): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function absoluteFromPage(href: string): string {
  try {
    return new URL(href, window.location.href).href;
  } catch {
    return href;
  }
}

function setMetaProperty(property: string, content: string) {
  const el = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (el) el.setAttribute("content", content);
}

function appendTrackedMeta(attr: "property" | "name", key: string, content: string) {
  const sel = attr === "property" ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-publication-seo", "");
    document.head.appendChild(el);
  } else if (!el.dataset.publicationSeo) {
    el.setAttribute("data-publication-seo", "");
  }
  el.setAttribute("content", content);
}

function removeTrackedPublicationMeta() {
  document.head.querySelectorAll("meta[data-publication-seo]").forEach((n) => n.remove());
}

function pubTypeIcon(type: PublicationPubType): LucideIcon {
  const m: Record<PublicationPubType, LucideIcon> = {
    article: FileText,
    etude: BookOpen,
    bulletin: Newspaper,
    analyse: Scale,
    guide: BookMarked,
    jurisprudence: Gavel,
    rapport: ScrollText,
  };
  return m[type] ?? FileText;
}

function authorDisplayName(pub: PublicationDetailType): string {
  if (pub.author) {
    const n = `${pub.author.firstName} ${pub.author.lastName}`.trim();
    if (n) return n;
  }
  return pub.authorName;
}

export default function PublicationDetail() {
  const { isDark, setIsDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Lang>("fr");
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const articleRef = useRef<HTMLDivElement | null>(null);

  const [publication, setPublication] = useState<PublicationDetailType | null>(null);
  const [related, setRelated] = useState<PublicationListItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [useful, setUseful] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoadState("error");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    (async () => {
      try {
        const detail = await getPublicationBySlug(slug);
        if (cancelled) return;
        setPublication(detail);
        setLoadState("ok");
        try {
          const rel = await getRelatedPublications(slug);
          if (!cancelled) {
            const merged =
              rel.length > 0 ? rel : (detail.relatedPublications?.length ? detail.relatedPublications : []);
            setRelated(merged);
          }
        } catch {
          if (!cancelled) setRelated(detail.relatedPublications ?? []);
        }
      } catch (e) {
        if (cancelled) return;
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          navigate("/publications", { replace: true });
          return;
        }
        if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
          setLoadState("forbidden");
        } else {
          setLoadState("error");
        }
        setPublication(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  useEffect(() => {
    if (!publication) return;

    const descriptionRaw =
      publication.metaDescription || publication.excerpt || publication.subtitle || htmlToPlainText(publication.content);
    const description = truncateSeoDescription(descriptionRaw || SITE_DEFAULT_DESCRIPTION);
    const docTitle = publication.metaTitle?.trim() || `${publication.title} — JUSTIA`;
    const socialTitle = publication.metaTitle?.trim() || publication.title;
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";
    const ogImage = publication.coverImage
      ? publication.coverImage.startsWith("http")
        ? publication.coverImage
        : absoluteFromPage(publication.coverImage)
      : absoluteFromPage("/og-image.jpg");

    const descEl = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevTitle = document.title;
    const prevDesc = descEl?.getAttribute("content") ?? SITE_DEFAULT_DESCRIPTION;

    const ogProps = ["og:type", "og:url", "og:title", "og:description", "og:image"] as const;
    const prevOg = new Map<string, string>();
    ogProps.forEach((k) => {
      const el = document.head.querySelector<HTMLMetaElement>(`meta[property="${k}"]`);
      if (el) prevOg.set(k, el.getAttribute("content") ?? "");
    });

    const twProps = ["twitter:card", "twitter:url", "twitter:title", "twitter:description", "twitter:image"] as const;
    const prevTw = new Map<string, string>();
    twProps.forEach((k) => {
      const el = document.head.querySelector<HTMLMetaElement>(`meta[property="${k}"]`);
      if (el) prevTw.set(k, el.getAttribute("content") ?? "");
    });

    document.title = docTitle;
    if (descEl) descEl.setAttribute("content", description);

    setMetaProperty("og:type", "article");
    setMetaProperty("og:url", pageUrl);
    setMetaProperty("og:title", socialTitle);
    setMetaProperty("og:description", description);
    setMetaProperty("og:image", ogImage);

    setMetaProperty("twitter:card", "summary_large_image");
    setMetaProperty("twitter:url", pageUrl);
    setMetaProperty("twitter:title", socialTitle);
    setMetaProperty("twitter:description", description);
    setMetaProperty("twitter:image", ogImage);

    if (publication.publishedAt) {
      const d = new Date(publication.publishedAt);
      if (!Number.isNaN(d.getTime())) {
        appendTrackedMeta("property", "article:published_time", d.toISOString());
      }
    }

    return () => {
      document.title = prevTitle;
      if (descEl) descEl.setAttribute("content", prevDesc);
      prevOg.forEach((v, k) => {
        const el = document.head.querySelector<HTMLMetaElement>(`meta[property="${k}"]`);
        if (el) el.setAttribute("content", v);
      });
      prevTw.forEach((v, k) => {
        const el = document.head.querySelector<HTMLMetaElement>(`meta[property="${k}"]`);
        if (el) el.setAttribute("content", v);
      });
      removeTrackedPublicationMeta();
    };
  }, [publication]);

  const needsMemberGate = Boolean(
    publication && !isAuthenticated && (publication.access === "members" || publication.access === "premium")
  );

  const previewPlain = useMemo(() => {
    if (!publication?.content) return "";
    return firstWords(htmlToPlainText(publication.content), PREVIEW_WORDS);
  }, [publication]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const pdfHref =
    publication?.hasPdf && (!needsMemberGate || isAuthenticated) ? getPublicationPdfUrl(publication.slug) : null;

  const TypeIcon = publication ? pubTypeIcon(publication.pubType) : FileText;
  const authorName = publication ? authorDisplayName(publication) : "";
  const authorAvatar = publication?.author?.avatar ? resolveMediaUrl(publication.author.avatar) : null;

  const tagsRow = (extraClass?: string) =>
    publication?.tags?.length ? (
      <div className={cn("flex flex-wrap gap-2", extraClass)}>
        {publication.tags.map((t) => (
          <Link
            key={t.id}
            to={`/publications?tag=${encodeURIComponent(t.slug)}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              isDark ? "border-white/20 text-[#00B2FF] hover:bg-white/10" : "border-slate-200 text-[#00B2FF] hover:bg-slate-50"
            )}
          >
            #{t.name}
          </Link>
        ))}
      </div>
    ) : null;

  return (
    <div className="min-h-screen">
      {loadState === "ok" && publication ? <ReadingProgress targetRef={articleRef} isDark={isDark} /> : null}
      <Header lang={lang} setLang={setLang} isDark={isDark} setIsDark={setIsDark} />
      <main>
        {loadState === "loading" && (
          <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-slate-500 dark:text-white/50">
            Chargement de l’article…
          </div>
        )}
        {loadState === "error" && (
          <div className="mx-auto max-w-3xl px-4 py-24 text-center">
            <p className="text-slate-600 dark:text-white/70">Cette publication est introuvable ou indisponible.</p>
            <Link to="/publications" className="mt-4 inline-block font-semibold text-[#00B2FF] hover:underline">
              ← Retour aux publications
            </Link>
          </div>
        )}
        {loadState === "forbidden" && (
          <div className="mx-auto max-w-3xl px-4 py-24 text-center">
            <p className="text-slate-600 dark:text-white/70">
              Ce contenu est réservé aux membres connectés ou aux abonnés.
            </p>
            <Link to="/client-space/login" className="mt-4 inline-block font-semibold text-[#00B2FF] hover:underline">
              Se connecter
            </Link>
          </div>
        )}
        {loadState === "ok" && publication && (
          <article>
            {/* Breadcrumb */}
            <div
              className={cn(
                "mx-auto max-w-5xl px-4 pt-6 text-sm sm:px-6 lg:px-8",
                isDark ? "text-white/55" : "text-slate-600"
              )}
            >
              <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-1">
                <Link to="/publications" className="font-medium text-[#00B2FF] hover:underline">
                  Publications
                </Link>
                {publication.category ? (
                  <>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                    <Link
                      to={`/publications?category=${encodeURIComponent(publication.category.slug)}`}
                      className="font-medium text-[#00B2FF] hover:underline"
                    >
                      {publication.category.name}
                    </Link>
                  </>
                ) : null}
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                <span className={cn("line-clamp-2 min-w-0 font-semibold", isDark ? "text-white" : "text-[#001A33]")}>
                  {publication.title}
                </span>
              </nav>
            </div>

            {/* Hero */}
            <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
              {publication.coverImage ? (
                <img
                  src={publication.coverImage}
                  alt={publication.coverAlt || publication.title}
                  className="max-h-[500px] w-full rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div
                  className="flex min-h-[220px] w-full items-end justify-start rounded-2xl p-8 md:min-h-[280px]"
                  style={{
                    background: `linear-gradient(135deg, ${publication.category?.color ?? "#00B2FF"} 0%, #001A33 100%)`,
                  }}
                >
                  <TypeIcon className="h-14 w-14 text-white/90 md:h-16 md:w-16" aria-hidden />
                </div>
              )}
            </div>

            {/* Article header */}
            <header className="mx-auto max-w-3xl px-4 pb-8 pt-10 text-center sm:px-6 lg:px-8">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                {publication.category ? (
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${publication.category.color}22`,
                      color: publication.category.color,
                    }}
                  >
                    {publication.category.name}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
                    isDark ? "border-white/20 text-white/80" : "border-slate-200 text-slate-600"
                  )}
                >
                  <TypeIcon className="h-3.5 w-3.5" aria-hidden />
                  {publication.pubTypeDisplay}
                </span>
              </div>

              <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-[#001A33] dark:text-white">
                {publication.title}
              </h1>
              {publication.subtitle ? (
                <p className="mt-4 text-xl italic text-gray-600 dark:text-white/65">{publication.subtitle}</p>
              ) : null}

              <div
                className={cn(
                  "mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm",
                  isDark ? "text-white/65" : "text-slate-600"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {authorAvatar ? (
                    <img src={authorAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-[#001A33]",
                        isDark ? "bg-[#00B2FF]/30 text-white" : "bg-[#00B2FF]/20"
                      )}
                      aria-hidden
                    >
                      {authorName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </span>
                  )}
                  <span className="font-semibold text-[#001A33] dark:text-white">{authorName}</span>
                </span>
                <span aria-hidden className={isDark ? "text-white/35" : "text-slate-300"}>
                  ·
                </span>
                {publication.publishedAt ? (
                  <time dateTime={publication.publishedAt}>
                    {format(new Date(publication.publishedAt), "d MMMM yyyy", { locale: fr })}
                  </time>
                ) : null}
                <span aria-hidden className={isDark ? "text-white/35" : "text-slate-300"}>
                  ·
                </span>
                <span>{publication.readingTime} min de lecture</span>
                <span aria-hidden className={isDark ? "text-white/35" : "text-slate-300"}>
                  ·
                </span>
                <span>{publication.viewsCount} vues</span>
              </div>

              {tagsRow("mt-6 justify-center")}

              <div className="mt-8 flex justify-center">
                <ShareButtons
                  title={publication.title}
                  description={publication.metaDescription}
                  url={shareUrl}
                  isDark={isDark}
                  includeFacebook={false}
                  pdfHref={pdfHref}
                  showShareLabel={false}
                  className="justify-center"
                />
              </div>
            </header>

            <div ref={articleRef} className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 lg:px-8">
              {/* Body */}
              {needsMemberGate ? (
                <div className="space-y-6">
                  <div
                    className={cn(
                      "prose prose-lg max-w-none dark:prose-invert",
                      "prose-headings:font-display prose-headings:text-[#001A33] prose-headings:dark:text-white",
                      "prose-p:text-slate-700 prose-p:dark:text-white/80 prose-p:leading-relaxed",
                      "prose-a:text-[#00B2FF]",
                      "prose-blockquote:border-l-[#00B2FF]"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{previewPlain}…</p>
                  </div>
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-2xl border p-8 text-center",
                      isDark ? "border-white/15 bg-[#0b2441]/60" : "border-slate-200 bg-slate-50"
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 select-none blur-sm opacity-50"
                      aria-hidden
                    >
                      <p className="px-4 text-left text-sm leading-loose">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <span key={i} className="mb-2 block h-3 rounded bg-slate-300/80 dark:bg-white/20" />
                        ))}
                      </p>
                    </div>
                    <div className="relative z-10 flex flex-col items-center gap-4 pt-4">
                      <p className={cn("flex items-center justify-center gap-2 text-lg font-semibold", isDark ? "text-white" : "text-[#001A33]")}>
                        <Lock className="h-5 w-5 text-[#00B2FF]" aria-hidden />
                        Connectez-vous pour lire la suite
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <Link
                          to="/client-space/login"
                          className="inline-flex rounded-full bg-[#00B2FF] px-6 py-2.5 text-sm font-bold text-[#001A33] hover:bg-white"
                        >
                          Se connecter
                        </Link>
                        <Link
                          to="/client-space/register"
                          className={cn(
                            "inline-flex rounded-full border px-6 py-2.5 text-sm font-semibold",
                            isDark ? "border-white/30 text-white hover:bg-white/10" : "border-slate-300 text-[#001A33] hover:bg-white"
                          )}
                        >
                          Créer un compte
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "prose prose-lg max-w-none dark:prose-invert",
                    "prose-headings:font-display prose-headings:text-[#001A33] prose-headings:dark:text-white",
                    "prose-p:text-slate-700 prose-p:dark:text-white/80",
                    "prose-a:text-[#00B2FF]",
                    "prose-blockquote:border-l-[#00B2FF]"
                  )}
                  dangerouslySetInnerHTML={{ __html: publication.content }}
                />
              )}

              {/* Article footer */}
              <footer className={cn("mt-14 space-y-8 border-t pt-10", isDark ? "border-white/10" : "border-slate-200")}>
                {tagsRow()}
                <ShareButtons
                  title={publication.title}
                  description={publication.metaDescription}
                  url={shareUrl}
                  isDark={isDark}
                  includeFacebook={false}
                  pdfHref={pdfHref}
                  showShareLabel={false}
                />
                {publication.hasPdf && pdfHref ? (
                  <div>
                    <Link
                      to={pdfHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full border border-[#00B2FF] px-5 py-2 text-sm font-semibold text-[#00B2FF] hover:bg-[#00B2FF]/10"
                    >
                      Télécharger le PDF
                    </Link>
                  </div>
                ) : null}

                <div>
                  <p className={cn("mb-3 text-sm font-semibold", isDark ? "text-white/80" : "text-slate-700")}>
                    Cet article vous a été utile ?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setUseful((u) => (u === "up" ? null : "up"))}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        useful === "up"
                          ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : isDark
                            ? "border-white/20 text-white hover:border-[#00B2FF]"
                            : "border-slate-200 text-slate-700 hover:border-[#00B2FF]"
                      )}
                    >
                      <ThumbsUp className="h-4 w-4" aria-hidden /> Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseful((u) => (u === "down" ? null : "down"))}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        useful === "down"
                          ? "border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-200"
                          : isDark
                            ? "border-white/20 text-white hover:border-[#00B2FF]"
                            : "border-slate-200 text-slate-700 hover:border-[#00B2FF]"
                      )}
                    >
                      <ThumbsDown className="h-4 w-4" aria-hidden /> Non
                    </button>
                  </div>
                </div>
              </footer>

              {/* Author box */}
              <section
                className={cn(
                  "mt-12 flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-start",
                  isDark ? "border-white/15 bg-[#0b2441]/40" : "border-slate-200 bg-white/90"
                )}
              >
                {authorAvatar ? (
                  <img src={authorAvatar} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    className={cn(
                      "flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold",
                      isDark ? "bg-[#00B2FF]/25 text-white" : "bg-[#00B2FF]/15 text-[#001A33]"
                    )}
                    aria-hidden
                  >
                    {authorName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </span>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className={cn("text-lg font-bold", isDark ? "text-white" : "text-[#001A33]")}>{authorName}</p>
                  {publication.authorBio ? (
                    <p className={cn("mt-2 text-sm leading-relaxed", isDark ? "text-white/70" : "text-slate-600")}>
                      {publication.authorBio}
                    </p>
                  ) : null}
                  <Link to="/publications" className="mt-3 inline-flex text-sm font-semibold text-[#00B2FF] hover:underline">
                    Voir toutes ses publications →
                  </Link>
                </div>
              </section>

              <div className="mt-16 space-y-16">
                <RelatedPublications items={related} isDark={isDark} limit={3} />
                <CommentSection
                  slug={publication.slug}
                  initialComments={publication.comments}
                  initialCount={publication.commentsCount}
                  isDark={isDark}
                />
              </div>
            </div>
          </article>
        )}
      </main>

      {loadState === "ok" && publication ? (
        <NewsletterBanner
          isDark={isDark}
          langPref={lang === "ar" ? "ar" : lang === "en" ? "en" : "fr"}
          variant="articleStrip"
        />
      ) : null}

      <Footer lang={lang} isDark={isDark} />
    </div>
  );
}
