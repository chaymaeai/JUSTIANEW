import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Eye, Download, Share2 } from "lucide-react";
import { api } from "@/services/api";

interface Doc {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  size: number;
  created_at: string;
  demande?: string;
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function FournisseurDocuments() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchDocs = () => {
  setLoading(true);
  api.get("/documents/")
    .then((res) => {
      const raw = res.data?.results ?? res.data ?? [];
      setDocs(raw);
    })
    .catch(() => setDocs([]))
    .finally(() => setLoading(false));
};

useEffect(() => {
  fetchDocs();
}, []);
  const handleDownload = async (doc: Doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download/`);
      const link = document.createElement("a");
      link.href = res.data.url;
      link.download = doc.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      alert("Impossible de télécharger ce fichier.");
    }
  };

  const handlePreview = async (doc: Doc) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download/`);
      window.open(res.data.url, "_blank");
    } catch {
      alert("Aperçu non disponible.");
    }
  };

  const filtered = docs.filter((doc) =>
    doc.name.toLowerCase().includes(query.toLowerCase())
  );
  const handleUploadClick = () => {
  fileInputRef.current?.click();
};

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", file.name);

  try {
    setUploading(true);
    await api.post("/documents/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    alert("Document uploadé avec succès !");
    fetchDocs();
  } catch {
    alert("Erreur lors de l'upload.");
  } finally {
    setUploading(false);
    e.target.value = "";
  }
};
const handleDelete = async (id: string) => {
  if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return;

  try {
    await api.delete(`/documents/${id}/`);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  } catch {
    alert("Erreur lors de la suppression.");
  }
};

  return (
    <div className="space-y-4">
      <input
      type="file"
      ref={fileInputRef}
      className="hidden"
      onChange={handleFileChange}
    />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <Input
            className="max-w-md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un document..."
          />
          <Button 
  className="bg-cyan text-white hover:bg-cyan/90"
  onClick={handleUploadClick}
  disabled={uploading}
>
  {uploading ? "Upload en cours..." : "Uploader un document"}
</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <p className="text-sm text-slate-500">Chargement...</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-slate-500">Aucun document trouvé.</p>
          )}
          {filtered.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatSize(doc.size)} • {new Date(doc.created_at).toLocaleDateString("fr-FR")} • {doc.file_type}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handlePreview(doc)}>
                  <Eye className="mr-1 h-4 w-4" /> Aperçu
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                  <Download className="mr-1 h-4 w-4" /> Télécharger
                </Button>
                 <Button
                 size="sm"
                 variant="outline"
                 className="text-red-600 hover:bg-red-50"
                 onClick={() => handleDelete(doc.id)}
                >
                Supprimer
               </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}