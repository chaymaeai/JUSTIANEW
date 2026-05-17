import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileImage, FileText, FileType2, Grid2X2, List, Search, Trash2, Upload, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/pages/client/DashboardContext";
import type { Document } from "@/types/client";
import { api, getApiErrorMessage } from "@/services/api";

type FilterType = "tous" | "contrats" | "rapports" | "pieces_jointes" | "factures";
type SortType = "date_desc" | "name_asc" | "size_desc";
type ViewMode = "grid" | "list";

interface LocalDocument extends Document {
  category: Exclude<FilterType, "tous">;
  demandeReference?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function truncateName(value: string, maxLength = 38) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function inferCategory(name: string): Exclude<FilterType, "tous"> {
  const lower = name.toLowerCase();
  if (lower.includes("contrat") || lower.includes("nda")) return "contrats";
  if (lower.includes("rapport") || lower.includes("pv")) return "rapports";
  if (lower.includes("facture")) return "factures";
  return "pieces_jointes";
}

function getDocExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getTypeIcon(name: string) {
  const ext = getDocExt(name);
  if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (ext === "docx") return <FileType2 className="h-5 w-5 text-blue-600" />;
  return <FileImage className="h-5 w-5 text-slate-500" />;
}

export default function ClientDocuments() {
  const { documents, demandes } = useDashboard();
  const inputRef = useRef<HTMLInputElement>(null);

  const [allDocuments, setAllDocuments] = useState<LocalDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("tous");
  const [sort, setSort] = useState<SortType>("date_desc");
  const [view, setView] = useState<ViewMode>("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<LocalDocument | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDemandeId, setUploadDemandeId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // ✅ Charger les documents depuis l'API au montage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDocsLoading(true);
      try {
        const { data } = await api.get("/documents/");
        const results = Array.isArray(data) ? data : data.results ?? [];
        if (!cancelled) {
          setAllDocuments(
            results.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              type: getDocExt(doc.name),
              size: doc.size,
              uploadedAt: doc.created_at,
              url: doc.file_url ?? "#",
              category: inferCategory(doc.name),
              demandeReference: doc.demande_reference ?? undefined,
            }))
          );
        }
      } catch {
        // Si l'API échoue, fallback sur les données du contexte
        if (!cancelled) {
          setAllDocuments(
            documents.map((doc, index) => ({
              ...doc,
              category: inferCategory(doc.name),
              demandeReference: demandes[index % demandes.length]?.reference,
            }))
          );
        }
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredDocuments = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...allDocuments]
      .filter((doc) => {
        const matchSearch = !q || doc.name.toLowerCase().includes(q);
        const matchFilter = filter === "tous" || doc.category === filter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        if (sort === "date_desc") return +new Date(b.uploadedAt) - +new Date(a.uploadedAt);
        if (sort === "name_asc") return a.name.localeCompare(b.name, "fr");
        return b.size - a.size;
      });
  }, [allDocuments, filter, search, sort]);

  const appendFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const invalid = incoming.find(
      (file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_SIZE_BYTES
    );
    if (invalid) {
      setUploadError("Type ou taille invalide. Formats: PDF, DOCX, JPG, PNG (max 10MB).");
      return;
    }
    setUploadError("");
    const deduped = incoming.filter(
      (file) =>
        !uploadFiles.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified
        )
    );
    setUploadFiles((prev) => [...prev, ...deduped]);
  };

  // ✅ Upload : api.post sans Content-Type manuel (Axios gère le boundary)
  // ✅ REMPLACE UNIQUEMENT TON ANCIEN handleUpload PAR CE CODE COMPLET :

const handleUpload = async () => {
  // Vérifie qu’au moins un fichier est sélectionné
  if (!uploadFiles.length) {
    setUploadError("Ajoutez au moins un fichier.");
    return;
  }

  setIsUploading(true);
  setUploadError("");

  try {
    const uploadedDocs: LocalDocument[] = [];

    // Upload de chaque fichier individuellement
    for (const file of uploadFiles) {
      const formData = new FormData();

      formData.append("file", file, file.name);
      formData.append("name", file.name);

      // Association facultative à une demande
      if (uploadDemandeId) {
        formData.append("demande", uploadDemandeId);
      }

      // ✅ Envoi vers backend
      const { data } = await api.post("/documents/", formData);

      /**
       * ✅ PRIORITÉ URL :
       * 1. file_url renvoyé directement par backend
       * 2. url standard
       * 3. file
       * 4. URL locale temporaire immédiate
       */
      let freshUrl =
        data.file_url ||
        data.url ||
        data.file ||
        null;

      // ✅ Si aucune URL backend immédiate :
      // aperçu instantané local sans refresh
      if (!freshUrl) {
        freshUrl = URL.createObjectURL(file);
      }

      /**
       * ✅ Tentative secondaire :
       * certaines APIs ont /download/ prêt juste après upload
       */
      try {
        const dlRes = await api.get(`/documents/${data.id}/download/`);

        if (dlRes.data?.url) {
          freshUrl = dlRes.data.url;
        }
      } catch {
        // Non bloquant : on garde l’URL actuelle
      }

      // ✅ Création document frontend instantané
      uploadedDocs.push({
        id:
          data.id?.toString() ||
          `local-${Date.now()}-${Math.random()}`,
        name: data.name ?? file.name,
        type: getDocExt(file.name),
        size: file.size,
        uploadedAt:
          data.created_at ?? new Date().toISOString(),
        url: freshUrl,
        category: inferCategory(file.name),
        demandeReference:
          demandes.find(
            (d) => d.id === uploadDemandeId
          )?.reference ?? undefined,
      });
    }

    /**
     * ✅ Mise à jour immédiate UI :
     * le fichier apparaît ET aperçu fonctionne
     */
    setAllDocuments((prev) => [
      ...uploadedDocs.reverse(),
      ...prev,
    ]);

    // ✅ Reset interface
    setUploadFiles([]);
    setUploadDemandeId("");
    setUploadOpen(false);

  } catch (error) {
    console.error("Upload error:", error);

    setUploadError(
      getApiErrorMessage(
        error,
        "Échec de l'upload."
      )
    );
  } finally {
    setIsUploading(false);
  }
};

  // ✅ APRÈS — appelle l'API puis supprime localement
const removeDocument = async (docId: string) => {
  // Vérification si l'ID est temporaire (upload local non sauvegardé)
  if (docId.startsWith("local-")) {
    setAllDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    if (previewDoc?.id === docId) setPreviewDoc(null);
    return;
  }

  try {
    await api.delete(`/documents/${docId}/`);
    // ✅ Supprime localement seulement si l'API a réussi
    setAllDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    if (previewDoc?.id === docId) setPreviewDoc(null);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 403) {
      alert("Vous n'avez pas la permission de supprimer ce document.");
    } else if (status === 404) {
      // Document déjà supprimé côté serveur — on nettoie localement
      setAllDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      if (previewDoc?.id === docId) setPreviewDoc(null);
    } else {
      alert("Impossible de supprimer ce document. Veuillez réessayer.");
    }
  }
};

  const isPdf = previewDoc?.name.toLowerCase().endsWith(".pdf");
  const isImage = Boolean(previewDoc?.name.toLowerCase().match(/\.(png|jpg|jpeg)$/));

  const handleDownload = async (doc: LocalDocument) => {
  try {
    // ✅ Si URL déjà valide (upload récent ou backend direct)
    if (
      doc.url &&
      doc.url !== "#" &&
      !doc.url.includes("/download/")
    ) {
      const link = document.createElement("a");
      link.href = doc.url;
      link.download = doc.name;
      link.target = "_blank";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // ✅ Fallback backend si disponible
    const res = await api.get(`/documents/${doc.id}/download/`);

    const link = document.createElement("a");
    link.href = res.data.url;
    link.download = doc.name;
    link.target = "_blank";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error("Download error:", error);

    // ✅ Dernier fallback
    if (doc.url && doc.url !== "#") {
      window.open(doc.url, "_blank");
      return;
    }

    alert("Impossible de télécharger ce fichier.");
  }
};

const handlePreview = async (doc: LocalDocument) => {
  try {
    const isImageFile = /\.(png|jpg|jpeg)$/i.test(doc.name);
    const isPdfFile = /\.pdf$/i.test(doc.name);

    let fileUrl = doc.url;

    // Si URL absente ou placeholder
    if (!fileUrl || fileUrl === "#") {
      try {
        const res = await api.get(`/documents/${doc.id}/download/`);
        fileUrl = res.data.url;
      } catch {
        fileUrl = doc.url;
      }
    }

    if (!fileUrl || fileUrl === "#") {
      alert("Aperçu non disponible.");
      return;
    }

    // ✅ Images => modal preview
    if (isImageFile) {
      setPreviewDoc({
        ...doc,
        url: fileUrl,
      });
      return;
    }

    // ✅ PDF => nouvel onglet (évite X-Frame-Options)
    if (isPdfFile) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // ✅ DOCX/autres => téléchargement ou nouvel onglet
    window.open(fileUrl, "_blank", "noopener,noreferrer");

  } catch (error) {
    console.error("Preview error:", error);
    alert("Aperçu non disponible.");
  }
};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Mes documents</CardTitle>
          <Button className="bg-cyan text-white hover:bg-cyan/90" onClick={() => setUploadOpen(true)}>
            Uploader un fichier +
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={filter}
            onChange={(event) => setFilter(event.target.value as FilterType)}
          >
            <option value="tous">Tous</option>
            <option value="contrats">Contrats</option>
            <option value="rapports">Rapports</option>
            <option value="pieces_jointes">Pieces jointes</option>
            <option value="factures">Factures</option>
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortType)}
          >
            <option value="date_desc">Date ↓</option>
            <option value="name_asc">Nom A-Z</option>
            <option value="size_desc">Taille</option>
          </select>
          <div className="flex rounded-md border border-slate-200 p-1 dark:border-slate-700">
            <Button
              variant="outline"
              size="sm"
              className={view === "grid" ? "border-cyan text-cyan bg-cyan/10" : ""}
              onClick={() => setView("grid")}
            >
              <Grid2X2 className="mr-1 h-4 w-4" /> Grille
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="mr-1 h-4 w-4" /> Liste
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {docsLoading ? (
            <p className="py-8 text-center text-sm text-slate-500">Chargement des documents...</p>
          ) : filteredDocuments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Aucun document trouvé.</p>
          ) : view === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center gap-2">
                    {getTypeIcon(doc.name)}
                    <p className="truncate text-sm font-semibold">{truncateName(doc.name)}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Demande: {doc.demandeReference ?? "-"}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handlePreview(doc)}>
                      <Eye className="mr-1 h-4 w-4" /> Apercu
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                      <Download className="mr-1 h-4 w-4" /> Telecharger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => void removeDocument(doc.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Taille</th>
                    <th className="px-3 py-2">Date upload</th>
                    <th className="px-3 py-2">Demande</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-3">{getTypeIcon(doc.name)}</td>
                      <td className="max-w-[260px] px-3 py-3 font-medium">{truncateName(doc.name, 50)}</td>
                      <td className="px-3 py-3">{formatSize(doc.size)}</td>
                      <td className="px-3 py-3">{new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-3">{doc.demandeReference ?? "-"}</td>
                      {/* ✅ Commentaires JSX — pas de // dans JSX */}
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => handlePreview(doc)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => void  removeDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Uploader un fichier</CardTitle>
              <Button variant="ghost" onClick={() => setUploadOpen(false)}>Fermer</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.docx,.jpg,.jpeg,.png"
                onChange={(event) => appendFiles(event.target.files)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragOver(false);
                  appendFiles(event.dataTransfer.files);
                }}
                className={`w-full rounded-xl border-2 border-dashed p-8 text-center ${
                  isDragOver
                    ? "border-cyan bg-cyan/10"
                    : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <Upload className="mx-auto mb-2 h-6 w-6 text-cyan" />
                <p className="text-sm font-medium">Glisser-deposer vos fichiers ici</p>
                <p className="text-xs text-slate-500">PDF, DOCX, JPG, PNG - taille max 10MB</p>
              </button>

              <div className="space-y-2">
                <label className="text-sm font-medium">Associer a une demande (optionnel)</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={uploadDemandeId}
                  onChange={(event) => setUploadDemandeId(event.target.value)}
                >
                  <option value="">Aucune</option>
                  {demandes.map((demande) => (
                    <option key={demande.id} value={demande.id}>
                      {demande.reference}
                    </option>
                  ))}
                </select>
              </div>

              {uploadFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                    >
                      {file.name} - {formatSize(file.size)}
                    </div>
                  ))}
                </div>
              )}

              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

              <div className="flex justify-end">
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? "Upload en cours..." : "Uploader"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="truncate text-base">{previewDoc.name}</CardTitle>
              <Button variant="ghost" onClick={() => setPreviewDoc(null)}>Fermer</Button>
            </CardHeader>
            <CardContent>
              {isPdf && (
                <iframe
                  title={previewDoc.name}
                  src={previewDoc.url}
                  className="h-[70vh] w-full rounded-md border"
                />
              )}
              {isImage && (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="mx-auto max-h-[72vh] rounded-md object-contain"
                />
              )}
              {!isPdf && !isImage && (
                <div className="space-y-3 text-sm">
                  <p>Apercu non disponible pour ce type de fichier.</p>
                  <a href={previewDoc.url} download={previewDoc.name}>
                    <Button>
                      <Download className="mr-1 h-4 w-4" />
                      Telecharger le document
                    </Button>
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}