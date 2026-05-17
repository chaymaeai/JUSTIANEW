import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ExternalLink, ImagePlus, Loader2, Newspaper, Plus, Save, Send, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getApiErrorMessage } from "@/services/api";
import {
  createStaffPublication,
  getPublicationBySlug,
  listCategories,
  listPublications,
  publishStaffPublication,
  deleteStaffPublication,
  updateStaffPublication,
  uploadPublicationInlineImage,
} from "@/services/publicationService";
import type {
  PublicationPubType,
  PublicationStatus,
  PublicationAccess,
  PublicationLanguage,
  PublicationListItem,
  PublicationCategory,
} from "@/types/publication";
import { cn } from "@/lib/utils";

const PUB_TYPES: { value: PublicationPubType; label: string }[] = [
  { value: "article", label: "Article" },
  { value: "etude", label: "Étude juridique" },
  { value: "bulletin", label: "Bulletin réglementaire" },
  { value: "analyse", label: "Analyse" },
  { value: "guide", label: "Guide pratique" },
  { value: "jurisprudence", label: "Jurisprudence" },
  { value: "rapport", label: "Rapport" },
];

const STATUSES: { value: PublicationStatus; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "revision", label: "En révision" },
  { value: "planifie", label: "Planifié" },
  { value: "publie", label: "Publié" },
  { value: "archive", label: "Archivé" },
];

const ACCESS: { value: PublicationAccess; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "members", label: "Membres connectés" },
  { value: "premium", label: "Premium" },
];

const LANGS: { value: PublicationLanguage; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

const emptyForm = {
  title: "",
  subtitle: "",
  excerpt: "",
  content: "",
  pub_type: "article" as PublicationPubType,
  categoryId: "",
  language: "fr" as PublicationLanguage,
  status: "brouillon" as PublicationStatus,
  access: "public" as PublicationAccess,
  is_featured: false,
  is_newsletter: false,
  author_name: "",
  cover_alt: "",
  meta_title: "",
  meta_description: "",
};

export default function ClientAdminPublications() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const editSlug = searchParams.get("edit") ?? "";

  const [categories, setCategories] = useState<PublicationCategory[]>([]);
  const [items, setItems] = useState<PublicationListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listFilter, setListFilter] = useState<"" | "brouillon" | "publie">("");
  const [form, setForm] = useState(emptyForm);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [inlineImageBusy, setInlineImageBusy] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await listPublications({
        page: 1,
        pageSize: 100,
        ordering: "-updated_at",
        status: listFilter || undefined,
      });
      setItems(res.items);
    } catch (e) {
      setItems([]);
      setMessage({ type: "err", text: getApiErrorMessage(e, "Impossible de charger la liste.") });
    } finally {
      setListLoading(false);
    }
  }, [listFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

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

  const fillFromDetail = useCallback((pub: Awaited<ReturnType<typeof getPublicationBySlug>>) => {
    setForm({
      title: pub.title,
      subtitle: pub.subtitle,
      excerpt: pub.excerpt,
      content: pub.content,
      pub_type: pub.pubType,
      categoryId: pub.category?.id ?? "",
      language: pub.language,
      status: pub.status,
      access: pub.access,
      is_featured: pub.isFeatured,
      is_newsletter: false,
      author_name: pub.authorName,
      cover_alt: pub.coverAlt,
      meta_title: pub.metaTitle,
      meta_description: pub.metaDescription,
    });
    setEditingSlug(pub.slug);
    setCoverFile(null);
    setExistingCoverUrl(pub.coverImage);
  }, []);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    if (!editSlug) {
      setEditingSlug(null);
      setExistingCoverUrl(null);
      setCoverFile(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setMessage(null);
    (async () => {
      try {
        const pub = await getPublicationBySlug(editSlug);
        if (cancelled) return;
        fillFromDetail(pub);
      } catch (e) {
        if (!cancelled) {
          setMessage({ type: "err", text: getApiErrorMessage(e, "Publication introuvable.") });
          setSearchParams({}, { replace: true });
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editSlug, fillFromDetail, setSearchParams]);

  const startNew = (options?: { preserveMessage?: boolean }) => {
    setSearchParams({}, { replace: true });
    setForm(emptyForm);
    setEditingSlug(null);
    if (!options?.preserveMessage) setMessage(null);
    setCoverFile(null);
    setExistingCoverUrl(null);
  };

  const openEdit = (slug: string) => {
    setSearchParams({ edit: slug }, { replace: true });
  };

  const payloadFromForm = useMemo(
    () => ({
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      pub_type: form.pub_type,
      category: form.categoryId || null,
      language: form.language,
      status: form.status,
      access: form.access,
      is_featured: form.is_featured,
      is_newsletter: form.is_newsletter,
      author_name: form.author_name.trim(),
      cover_alt: form.cover_alt.trim(),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
    }),
    [form]
  );

  const handleSave = async () => {
    setMessage(null);
    if (!payloadFromForm.title) {
      setMessage({ type: "err", text: "Le titre est requis." });
      return;
    }
    const plain = form.content.replace(/<[^>]*>/g, "").trim();
    const contentMissing =
      form.status !== "brouillon" && form.status !== "revision" && !plain;
    if (contentMissing) {
      setMessage({ type: "err", text: "Ajoutez du contenu avant de publier ou repassez en brouillon." });
      return;
    }
    setSaving(true);
    try {
      const coverOpts = coverFile ? { coverFile } : undefined;
      if (editingSlug) {
        await updateStaffPublication(editingSlug, payloadFromForm, coverOpts);
        setMessage({ type: "ok", text: "Publication mise à jour." });
        setCoverFile(null);
        const pub = await getPublicationBySlug(editingSlug);
        setExistingCoverUrl(pub.coverImage);
      } else {
        const slug = await createStaffPublication(payloadFromForm, coverOpts);
        setMessage({ type: "ok", text: "Publication créée." });
        setCoverFile(null);
        setSearchParams({ edit: slug }, { replace: true });
      }
      await loadList();
    } catch (e) {
      setMessage({ type: "err", text: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!editingSlug) {
      setMessage({ type: "err", text: "Enregistrez d'abord la publication." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateStaffPublication(editingSlug, payloadFromForm, coverFile ? { coverFile } : undefined);
      await publishStaffPublication(editingSlug);
      setMessage({ type: "ok", text: "Publication mise en ligne." });
      const pub = await getPublicationBySlug(editingSlug);
      fillFromDetail(pub);
      await loadList();
    } catch (e) {
      setMessage({ type: "err", text: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePublication = async (slug: string, title?: string) => {
    const label = title?.trim() ? `« ${title.trim()} »` : "cette publication";
    if (
      !window.confirm(
        `Supprimer définitivement ${label} ? Les commentaires associés seront aussi supprimés. Cette action est irréversible.`
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await deleteStaffPublication(slug);
      if (editSlug === slug || editingSlug === slug) {
        startNew({ preserveMessage: true });
      }
      setMessage({ type: "ok", text: "Publication supprimée." });
      await loadList();
    } catch (e) {
      setMessage({ type: "err", text: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "admin") {
    return <Navigate to="/espace-client/dashboard" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
            <Newspaper className="h-6 w-6 text-cyan" />
            Rédaction — publications
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Créez et gérez les articles du site (réservé administrateur).
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => startNew()} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle publication
        </Button>
      </div>

      {message && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          )}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">{editingSlug ? `Modifier — ${editingSlug}` : "Nouvelle publication"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingDetail ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pub-title">Titre</Label>
                  <Input
                    id="pub-title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Titre de la publication"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pub-subtitle">Sous-titre</Label>
                  <Input
                    id="pub-subtitle"
                    value={form.subtitle}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pub-excerpt">Chapô / extrait</Label>
                  <Textarea
                    id="pub-excerpt"
                    rows={3}
                    value={form.excerpt}
                    onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <Label htmlFor="pub-cover">Image de couverture</Label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Affichée dans les listes et en tête d’article. JPEG, PNG, WebP ou GIF — max 5 Mo (corps du texte : bouton ci-dessous).
                  </p>
                  <Input
                    id="pub-cover"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="cursor-pointer text-sm file:mr-3 file:rounded-md file:border-0 file:bg-cyan file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setCoverFile(f);
                      e.target.value = "";
                    }}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="pub-cover-alt">Texte alternatif (accessibilité)</Label>
                    <Input
                      id="pub-cover-alt"
                      value={form.cover_alt}
                      onChange={(e) => setForm((f) => ({ ...f, cover_alt: e.target.value }))}
                      placeholder="Description courte de l’image"
                    />
                  </div>
                  {(coverPreviewUrl || existingCoverUrl) && (
                    <div className="mt-2 overflow-hidden rounded-md border border-slate-200 dark:border-slate-600">
                      <img
                        src={coverPreviewUrl ?? existingCoverUrl ?? ""}
                        alt={form.cover_alt || "Aperçu couverture"}
                        className="max-h-48 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Label htmlFor="pub-content">Contenu (HTML)</Label>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-cyan hover:underline">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={inlineImageBusy || saving}
                        onChange={(e) => {
                          const input = e.currentTarget;
                          const file = input.files?.[0];
                          if (!file) return;
                          void (async () => {
                            setMessage(null);
                            setInlineImageBusy(true);
                            try {
                              const url = await uploadPublicationInlineImage(file);
                              const alt =
                                form.cover_alt.trim() ||
                                form.title.trim() ||
                                "Illustration";
                              const safeAlt = alt.replace(/"/g, "'");
                              setForm((f) => ({
                                ...f,
                                content: `${f.content}\n<p><img src="${url}" alt="${safeAlt}" loading="lazy" /></p>\n`,
                              }));
                              setMessage({ type: "ok", text: "Image insérée dans le contenu." });
                            } catch (err) {
                              setMessage({
                                type: "err",
                                text: getApiErrorMessage(err, "Échec du téléversement de l’image."),
                              });
                            } finally {
                              setInlineImageBusy(false);
                              input.value = "";
                            }
                          })();
                        }}
                      />
                      <ImagePlus className="h-4 w-4 shrink-0" />
                      {inlineImageBusy ? "Téléversement…" : "Insérer une image dans le texte"}
                    </label>
                  </div>
                  <Textarea
                    id="pub-content"
                    rows={14}
                    value={form.content}
                    onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="<p>Votre texte… Vous pouvez coller du HTML simple.</p>"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.pub_type}
                      onChange={(e) => setForm((f) => ({ ...f, pub_type: e.target.value as PublicationPubType }))}
                    >
                      {PUB_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.categoryId}
                      onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    >
                      <option value="">— Aucune —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Langue</Label>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.language}
                      onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as PublicationLanguage }))}
                    >
                      {LANGS.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PublicationStatus }))}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Accès</Label>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={form.access}
                      onChange={(e) => setForm((f) => ({ ...f, access: e.target.value as PublicationAccess }))}
                    >
                      {ACCESS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pub-author-name">Nom d’auteur affiché (optionnel)</Label>
                  <Input
                    id="pub-author-name"
                    value={form.author_name}
                    onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
                    />
                    À la une (featured)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.is_newsletter}
                      onChange={(e) => setForm((f) => ({ ...f, is_newsletter: e.target.checked }))}
                    />
                    Inclure dans la newsletter à la publication
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pub-meta-title">Meta titre (SEO)</Label>
                    <Input
                      id="pub-meta-title"
                      value={form.meta_title}
                      onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pub-meta-desc">Meta description</Label>
                    <Input
                      id="pub-meta-desc"
                      value={form.meta_description}
                      onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {editingSlug ? "Enregistrer" : "Créer"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void handlePublish()} disabled={saving || !editingSlug}>
                    <Send className="mr-2 h-4 w-4" />
                    Publier maintenant
                  </Button>
                  {editingSlug && (
                    <Button type="button" variant="outline" asChild>
                      <Link to={`/publications/${editingSlug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Voir sur le site
                      </Link>
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Vos publications</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "", label: "Tous" },
                  { value: "brouillon", label: "Brouillons" },
                  { value: "publie", label: "Publiés" },
                ] as const
              ).map(({ value, label }) => (
                <Button
                  key={label}
                  type="button"
                  size="sm"
                  variant={listFilter === value ? "default" : "outline"}
                  onClick={() => setListFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {listLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Aucune publication.</p>
            ) : (
              <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {items.map((p) => (
                  <li key={p.id} className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(p.slug)}
                      className={cn(
                        "flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        editSlug === p.slug
                          ? "border-cyan bg-cyan/10 dark:bg-cyan/20"
                          : "border-slate-200 hover:border-cyan/50 dark:border-slate-700"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">{p.title}</p>
                        <p className="truncate text-xs text-slate-500">{p.slug}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 capitalize">
                        {p.status}
                      </Badge>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-auto shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                      title="Supprimer définitivement"
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeletePublication(p.slug, p.title);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
