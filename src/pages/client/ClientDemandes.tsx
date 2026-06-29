import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Demande, DemandeStatus, DomainJuridique } from "@/types/client";
import { api, getApiErrorMessage } from "@/services/api";

const domainLabels = {
  droit_affaires: "Droit des affaires",
  rgpd: "RGPD",
  droit_ia: "Droit IA",
  propriete_intellectuelle: "Propriete intellectuelle",
  droit_numerique: "Droit numerique",
  immobilier: "Immobilier",
  gouvernance: "Gouvernance",
} as const;

const domainMeta: Record<
  DomainJuridique,
  { icon: string; subtitle: string }
> = {
  droit_affaires: { icon: "🏢", subtitle: "Contrats, sociétés, litiges" },
  rgpd: { icon: "🔒", subtitle: "Protection des données personnelles" },
  droit_ia: { icon: "🤖", subtitle: "Responsabilité algorithmique, conformité IA" },
  propriete_intellectuelle: { icon: "💡", subtitle: "Marques, brevets, droits d'auteur" },
  droit_numerique: { icon: "🌐", subtitle: "Cybersécurité, e-commerce" },
  immobilier: { icon: "🏠", subtitle: "Baux, acquisition, copropriété" },
  gouvernance: { icon: "⚖️", subtitle: "Conformité, ESG, éthique" },
};

const statusStyles: Record<DemandeStatus, string> = {
  en_attente: "bg-amber-100 text-amber-700 border-amber-200",
  assignee: "bg-indigo-100 text-indigo-700 border-indigo-200",
  en_cours: "bg-blue-100 text-blue-700 border-blue-200",
  en_revision: "bg-violet-100 text-violet-800 border-violet-200",
  traitee: "bg-green-100 text-green-700 border-green-200",
  annulee: "bg-red-100 text-red-700 border-red-200",
};

const statusLabel: Record<DemandeStatus, string> = {
  en_attente: "En attente",
  assignee: "Assignee",
  en_cours: "En cours",
  en_revision: "En revision",
  traitee: "Traite",
  annulee: "Annule",
};

type DemandeListApiItem = {
  id: string;
  reference: string;
  domain: string;
  description?: string;
  urgency: string;
  status: string;
  created_at: string;
  updated_at?: string;
  documents_count?: number;
};

type DemandeListApiResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  pages: number;
  results: DemandeListApiItem[];
};

type Message = {
  id: string;
  sender_name: string;
  sender_role?: string;
  content: string;
  created_at: string;
};

// ✅ Document lié à une demande
type DemandeDocument = {
  id: string;
  name: string;
  file_type?: string;
  size?: number;
  created_at?: string;
  owner_name?: string;
};

function mapListItemToDemande(item: DemandeListApiItem): Demande {
  return {
    id: item.id,
    reference: item.reference,
    domain: item.domain as DomainJuridique,
    description: item.description ?? "",
    status: item.status as DemandeStatus,
    urgency: item.urgency as "normale" | "urgente" | "critique",
    createdAt: item.created_at,
    updatedAt: item.updated_at ?? item.created_at,
    documents: [],
    documentsCount: item.documents_count,
    consultations: [],
  };
}

const urgencyStyles: Record<"normale" | "urgente" | "critique", string> = {
  normale: "bg-slate-100 text-slate-700 border-slate-200",
  urgente: "bg-amber-100 text-amber-700 border-amber-200",
  critique: "bg-red-100 text-red-700 border-red-200",
};

const urgencyLabel: Record<"normale" | "urgente" | "critique", string> = {
  normale: "Normale",
  urgente: "Urgente",
  critique: "Critique",
};

export default function ClientDemandes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [domainFilter, setDomainFilter] = useState<string>("tous");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selected, setSelected] = useState<Demande | null>(null);
  const [drawerMessage, setDrawerMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [actionsMenu, setActionsMenu] = useState<{ demandeId: string; top: number; left: number } | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ État des documents du panneau de détail (au lieu de selected.documents qui était toujours [])
  const [documents, setDocuments] = useState<DemandeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    domain: "" as DomainJuridique | "",
    description: "",
    urgency: "normale" as "normale" | "urgente" | "critique",
  });

  const domainOptions = Object.entries(domainLabels) as [DomainJuridique, string][];

  const fetchMessages = useCallback(async (demandeId: string) => {
    setMessagesLoading(true);
    try {
      const res = await api.get(`/demandes/${demandeId}/messages/`);
      const data = res.data;
      const results: Message[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setMessages(results);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // ✅ Récupère la vraie liste des documents liés à la demande (client + expert confondus)
  const fetchDocuments = useCallback(async (demandeId: string) => {
    setDocumentsLoading(true);
    try {
      const res = await api.get("/documents/", { params: { demande: demandeId } });
      const data = res.data;
      const results: DemandeDocument[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setDocuments(results);
    } catch {
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const openDemande = useCallback(async (demande: Demande) => {
    setSelected(demande);
    setDrawerMessage("");
    await Promise.all([fetchMessages(demande.id), fetchDocuments(demande.id)]);
  }, [fetchMessages, fetchDocuments]);

  // ✅ Upload réel d'un document depuis le panneau de détail
  const handleAddDocument = async (file: File) => {
    if (!selected) return;
    setUploadingDoc(true);
    try {
      const documentForm = new FormData();
      documentForm.append("demande", selected.id);
      documentForm.append("name", file.name);
      documentForm.append("file", file, file.name);
      documentForm.append("file_type", "piece_jointe");
      documentForm.append("is_private", "false");
      await api.post("/documents/", documentForm);
      await fetchDocuments(selected.id);
      setToast("Document ajouté avec succès.");
    } catch (err) {
      setToast(getApiErrorMessage(err, "Erreur lors de l'ajout du document."));
    } finally {
      setUploadingDoc(false);
      setTimeout(() => setToast(""), 3000);
    }
  };

  const sendClientMessage = async () => {
    if (!drawerMessage.trim() || !selected || isSending) return;
    setIsSending(true);
    try {
      await api.post(`/demandes/${selected.id}/messages/`, {
        content: drawerMessage.trim(),
      });
      setDrawerMessage("");
      await fetchMessages(selected.id);
    } catch (err) {
      setToast(getApiErrorMessage(err, "Erreur lors de l'envoi"));
      setTimeout(() => setToast(""), 3000);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setShowModal(true);
    const params = new URLSearchParams(searchParams);
    params.delete("new");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      try {
        const { data } = await api.get<DemandeListApiResponse>("/demandes/", { params: { page_size: 100 } });
        if (!cancelled) {
          setDemandes(data.results.map(mapListItemToDemande));
        }
      } catch (e) {
        if (!cancelled) {
          setToast(getApiErrorMessage(e, "Impossible de charger les demandes."));
          window.setTimeout(() => setToast(""), 4000);
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!actionsMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest("[data-actions-floating-menu]") || el.closest("[data-actions-trigger]")) return;
      setActionsMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActionsMenu(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [actionsMenu]);

  const filtered = useMemo(() => {
    return demandes.filter((demande) => {
      const q = search.toLowerCase();
      const matchesSearch =
        demande.reference.toLowerCase().includes(q) ||
        domainLabels[demande.domain].toLowerCase().includes(q) ||
        demande.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "tous" || demande.status === statusFilter;
      const matchesDomain = domainFilter === "tous" || demande.domain === domainFilter;
      const matchesFrom = !fromDate || demande.createdAt.slice(0, 10) >= fromDate;
      const matchesTo = !toDate || demande.createdAt.slice(0, 10) <= toDate;
      return matchesSearch && matchesStatus && matchesDomain && matchesFrom && matchesTo;
    });
  }, [demandes, search, statusFilter, domainFilter, fromDate, toDate]);

  const closeModal = () => {
    setShowModal(false);
    setStep(1);
    setForm({ domain: "", description: "", urgency: "normale" });
    setNewFiles([]);
  };

  const submitNewDemand = async () => {
    setSubmitting(true);
    try {
      const filesToUpload = [...newFiles];
      const { data: created } = await api.post<{
        id: string;
        reference: string;
        domain: DomainJuridique;
        description: string;
        urgency: "normale" | "urgente" | "critique";
        status: DemandeStatus;
        created_at: string;
        updated_at: string;
      }>("/demandes/", {
        domain: form.domain,
        description: form.description,
        urgency: form.urgency,
      });

      let failedUploads = 0;
      if (filesToUpload.length > 0) {
        const uploadResults = await Promise.allSettled(
          filesToUpload.map(async (file) => {
            const documentForm = new FormData();
            documentForm.append("demande", created.id);
            documentForm.append("name", file.name);
            documentForm.append("file", file, file.name);
            documentForm.append("file_type", "piece_jointe");
            documentForm.append("is_private", "false");
            await api.post("/documents/", documentForm);
          })
        );
        failedUploads = uploadResults.filter((result) => result.status === "rejected").length;
      }

      const uploadedOk = filesToUpload.length - failedUploads;
      setDemandes((prev) => [
        {
          id: created.id,
          reference: created.reference,
          domain: created.domain,
          description: created.description,
          status: created.status,
          urgency: created.urgency,
          createdAt: created.created_at,
          updatedAt: created.updated_at,
          documents: [],
          documentsCount: uploadedOk,
          consultations: [],
        },
        ...prev.filter((d) => d.id !== created.id),
      ]);

      setToast(
        failedUploads > 0
          ? `Demande creee. ${failedUploads} document(s) n'ont pas ete envoyes.`
          : "Demande soumise avec succes."
      );
      closeModal();
    } catch (error) {
      setToast(getApiErrorMessage(error, "Erreur de soumission."));
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setToast(""), 2800);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Mes demandes</CardTitle>
          <Button className="bg-cyan text-white hover:bg-cyan/90" onClick={() => setShowModal(true)}>
            Nouvelle demande +
          </Button>
        </CardHeader>
      </Card>

      {toast && <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{toast}</div>}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <Input placeholder="Recherche par reference ou domaine" value={search} onChange={(event) => setSearch(event.target.value)} className="md:col-span-2" />
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="tous">Tous</option>
            <option value="en_attente">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="traitee">Traite</option>
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={domainFilter}
            onChange={(event) => setDomainFilter(event.target.value)}
          >
            <option value="tous">Tous domaines</option>
            {domainOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {listLoading ? (
            <p className="p-8 text-center text-sm text-slate-500">Chargement des demandes...</p>
          ) : demandes.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Vous n&apos;avez pas encore de demande.</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Aucune demande ne correspond a vos filtres.</p>
          ) : null}
          {!listLoading && filtered.length > 0 && (
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[140px_190px_1fr_130px_130px_120px_56px] items-center gap-3 border-b bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900">
                <span>Ref.</span>
                <span>Domaine</span>
                <span>Description</span>
                <span className="text-center">Urgence</span>
                <span className="text-center">Statut</span>
                <span className="text-center">Date</span>
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <span className="sr-only">Actions</span>
                  <span className="text-center text-slate-400" aria-hidden>···</span>
                </div>
              </div>
              {filtered.map((demande) => (
                <div key={demande.id} className="grid grid-cols-[140px_190px_1fr_130px_130px_120px_56px] items-center gap-3 border-b px-4 py-3 text-sm dark:border-slate-700">
                  <span className="font-semibold">{demande.reference}</span>
                  <span className="truncate">{domainLabels[demande.domain]}</span>
                  <span className="truncate text-slate-600 dark:text-slate-300">{demande.description}</span>
                  <div className="flex justify-center">
                    <Badge className={cn("inline-flex min-w-[92px] justify-center border px-2.5 py-1 text-xs font-medium", urgencyStyles[demande.urgency])}>
                      {urgencyLabel[demande.urgency]}
                    </Badge>
                  </div>
                  <div className="flex justify-center">
                    <Badge className={cn("inline-flex min-w-[96px] justify-center border px-2.5 py-1 text-xs font-medium", statusStyles[demande.status])}>
                      {statusLabel[demande.status]}
                    </Badge>
                  </div>
                  <span className="text-center">{new Date(demande.createdAt).toLocaleDateString("fr-FR")}</span>
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      data-actions-trigger
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label="Actions pour la demande"
                      aria-haspopup="menu"
                      aria-expanded={actionsMenu?.demandeId === demande.id}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const menuWidth = 220;
                        setActionsMenu((m) =>
                          m?.demandeId === demande.id
                            ? null
                            : {
                                demandeId: demande.id,
                                top: rect.bottom + 6,
                                left: Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.right - menuWidth)),
                              }
                        );
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {actionsMenu &&
        createPortal(
          (() => {
            const demandeRow = demandes.find((d) => d.id === actionsMenu.demandeId);
            if (!demandeRow) return null;
            return (
              <div
                data-actions-floating-menu
                role="menu"
                className="fixed z-[100] min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-900"
                style={{ top: actionsMenu.top, left: actionsMenu.left }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => {
                    void openDemande(demandeRow);
                    setActionsMenu(null);
                  }}
                >
                  Voir le detail
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  onClick={() => setActionsMenu(null)}
                >
                  Documents ({demandeRow.documentsCount ?? demandeRow.documents.length})
                </button>
                {demandeRow.status === "en_attente" && (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setDemandes((prev) =>
                        prev.map((item) =>
                          item.id === demandeRow.id
                            ? { ...item, status: "annulee" as const, updatedAt: new Date().toISOString() }
                            : item
                        )
                      );
                      setActionsMenu(null);
                    }}
                  >
                    Annuler la demande
                  </button>
                )}
              </div>
            );
          })(),
          document.body
        )}

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/40">
          <aside className="ml-auto h-full w-full max-w-[480px] overflow-y-auto bg-white p-5 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{selected.reference}</p>
                <Badge className={cn("mt-1 border", statusStyles[selected.status])}>{statusLabel[selected.status]}</Badge>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)}>Fermer</Button>
            </div>

            <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{selected.description}</p>
            <div className="mb-4 text-sm">
              <p>Domaine: {domainLabels[selected.domain]}</p>
              <p>Urgence: {selected.urgency}</p>
            </div>

            <div className="mb-5 space-y-2 text-sm">
              <p className="font-medium">Timeline</p>
              <p>● Demande creee — {new Date(selected.createdAt).toLocaleString("fr-FR")}</p>
              {selected.assignedTo && (
                <p>● Assignee a Me. {selected.assignedTo.lastName} — {new Date(selected.updatedAt).toLocaleString("fr-FR")}</p>
              )}
              {selected.consultations.length > 0 && (
                <p>● Consultation planifiee — {new Date(selected.consultations[0].scheduledAt).toLocaleDateString("fr-FR")}</p>
              )}
              <p>● En cours de traitement — {new Date(selected.updatedAt).toLocaleDateString("fr-FR")}</p>
            </div>

            {/* ✅ Documents attachés — chargés réellement via fetchDocuments, plus de tableau vide codé en dur */}
            <div className="mb-3 space-y-2 text-sm">
              <p className="font-medium">Documents attaches</p>
              {documentsLoading ? (
                <p className="text-slate-500">Chargement...</p>
              ) : documents.length === 0 ? (
                <p className="text-slate-500">Aucun document.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <span className="truncate">{doc.name}</span>
                    {doc.owner_name && (
                      <span className="ml-2 shrink-0 text-xs text-slate-400">{doc.owner_name}</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mb-5 space-y-2 text-sm">
              <p className="font-medium">Consultations liees</p>
              {selected.consultations.length === 0 ? (
                <p className="text-slate-500">Aucune consultation liee.</p>
              ) : (
                selected.consultations.map((cons) => (
                  <p key={cons.id}>
                    {cons.id} - {new Date(cons.scheduledAt).toLocaleString("fr-FR")}
                  </p>
                ))
              )}
            </div>

            {/* ✅ Input fichier caché + bouton réellement branché */}
            <input
              type="file"
              ref={docInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAddDocument(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              className="mb-4"
              disabled={uploadingDoc}
              onClick={() => docInputRef.current?.click()}
            >
              {uploadingDoc ? "Envoi en cours..." : "Ajouter un document"}
            </Button>

            <div className="space-y-3">
              <p className="text-sm font-medium">Messagerie avec l'expert</p>

              <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 dark:bg-slate-800">
                {messagesLoading ? (
                  <p className="text-center text-xs text-slate-400">Chargement...</p>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-400">Aucun message pour le moment.</p>
                ) : (
                  messages.map((msg) => {
                    const isExpert = msg.sender_role === "expert" || msg.sender_role === "fournisseur";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                          isExpert
                            ? "ml-auto bg-cyan/10 text-slate-800"
                            : "bg-white border border-slate-200 text-slate-700"
                        )}
                      >
                        <p className={cn("text-xs font-medium mb-1", isExpert ? "text-cyan" : "text-slate-500")}>
                          {msg.sender_name}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(msg.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <Textarea
                value={drawerMessage}
                onChange={(event) => setDrawerMessage(event.target.value)}
                placeholder="Votre message a l'expert..."
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    void sendClientMessage();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Ctrl+Entrée pour envoyer</p>
                <Button
                  className="bg-cyan text-white hover:bg-cyan/90"
                  onClick={sendClientMessage}
                  disabled={!drawerMessage.trim() || isSending}
                >
                  {isSending ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]">
          <Card className="relative z-[81] w-full max-w-3xl border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nouvelle demande</CardTitle>
              <Button variant="ghost" onClick={closeModal}>Fermer</Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 1 && (
                <div className="grid gap-3 md:grid-cols-3">
                  {domainOptions.map(([value, label]) => {
                    const meta = domainMeta[value];
                    const isSelected = form.domain === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, domain: value }))}
                        className={cn(
                          "flex flex-col items-start gap-2 rounded-xl border p-4 text-left text-sm transition hover:border-cyan/60 hover:bg-cyan/5",
                          isSelected
                            ? "border-cyan bg-cyan/10"
                            : "border-slate-200 dark:border-slate-700"
                        )}
                      >
                        <span className="text-2xl" aria-hidden="true">
                          {meta.icon}
                        </span>
                        <span className="font-medium leading-tight">{label}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                          {meta.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      💡 Décrivez le contexte, les parties impliquées, les enjeux et les délais.
                      Plus la description est détaillée, meilleure sera l&apos;analyse.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Description de la situation
                      <span className="ml-1 text-red-500" aria-hidden="true">*</span>
                    </label>
                    <Textarea
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder={
                        "Décrivez le contexte, les parties impliquées, les enjeux et les délais.\n" +
                        "Plus la description est détaillée, meilleure sera l'analyse."
                      }
                      className="min-h-[180px] resize-none text-sm leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          "text-xs transition-colors",
                          form.description.trim().length === 0
                            ? "text-slate-400"
                            : form.description.trim().length < 10
                            ? "text-red-500"
                            : form.description.trim().length < 80
                            ? "text-amber-500"
                            : "text-green-600"
                        )}
                      >
                        {form.description.trim().length === 0 && "Minimum 10 caractères requis"}
                        {form.description.trim().length > 0 && form.description.trim().length < 10 && (
                          `Encore ${10 - form.description.trim().length} caractère(s) requis`
                        )}
                        {form.description.trim().length >= 10 && form.description.trim().length < 80 && "Bonne description — plus de détails améliorent l'analyse"}
                        {form.description.trim().length >= 80 && "Description détaillée ✓"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {form.description.length} caractères
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {(
                      [
                        {
                          value: "normale",
                          label: "Normale",
                          responseTime: "Temps de réponse estimé : 48–72h",
                          desc: "Situation sans délai immédiat, traitement dans l'ordre des priorités.",
                          badgeColor: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
                          dotColor: "bg-slate-400",
                        },
                        {
                          value: "urgente",
                          label: "Urgente",
                          responseTime: "Temps de réponse estimé : 12–24h",
                          desc: "Situation nécessitant une intervention rapide avec un délai contraint.",
                          badgeColor: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400",
                          dotColor: "bg-amber-400",
                        },
                        {
                          value: "critique",
                          label: "Critique",
                          responseTime: "Réponse prioritaire immédiate",
                          desc: "Situation d'urgence absolue requérant une action sans délai.",
                          badgeColor: "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400",
                          dotColor: "bg-red-500",
                        },
                      ] as const
                    ).map(({ value, label, responseTime, desc, badgeColor, dotColor }) => {
                      const isSelected = form.urgency === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, urgency: value }))}
                          className={cn(
                            "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition hover:border-cyan/60 hover:bg-cyan/5",
                            isSelected
                              ? "border-cyan bg-cyan/10"
                              : "border-slate-200 dark:border-slate-700"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              isSelected
                                ? "border-cyan bg-cyan"
                                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                            )}
                            aria-hidden="true"
                          >
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </span>

                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                {label}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                  badgeColor
                                )}
                              >
                                <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} aria-hidden="true" />
                                {responseTime}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                              {desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Formats acceptés : PDF, DOC, DOCX, JPG, PNG, ZIP · Max 10 Mo par fichier
                    </p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                      Facultatif
                    </span>
                  </div>

                  <label
                    htmlFor="file-upload"
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-cyan/50 hover:bg-cyan/5 dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <span className="text-3xl" aria-hidden="true">📎</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Glissez vos fichiers ici ou{" "}
                        <span className="text-cyan underline underline-offset-2">parcourez</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">PDF, DOC, DOCX, JPG, PNG, ZIP</p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                      className="sr-only"
                      onChange={(e) => {
                        const incoming = Array.from(e.target.files ?? []);
                        setNewFiles((prev) => {
                          const existing = new Set(prev.map((f) => f.name + f.size));
                          return [...prev, ...incoming.filter((f) => !existing.has(f.name + f.size))];
                        });
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {newFiles.length > 0 && (
                    <ul className="space-y-2">
                      {newFiles.map((file, idx) => {
                        const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
                        const sizeKb = file.size / 1024;
                        const sizeLabel =
                          sizeKb >= 1024
                            ? `${(sizeKb / 1024).toFixed(1)} Mo`
                            : `${Math.round(sizeKb)} Ko`;
                        const extColors: Record<string, string> = {
                          PDF: "bg-red-50 text-red-600 border-red-200",
                          DOC: "bg-blue-50 text-blue-600 border-blue-200",
                          DOCX: "bg-blue-50 text-blue-600 border-blue-200",
                          JPG: "bg-green-50 text-green-600 border-green-200",
                          JPEG: "bg-green-50 text-green-600 border-green-200",
                          PNG: "bg-green-50 text-green-600 border-green-200",
                          ZIP: "bg-amber-50 text-amber-600 border-amber-200",
                        };
                        const badgeCls = extColors[ext] ?? "bg-slate-50 text-slate-600 border-slate-200";
                        return (
                          <li
                            key={`${file.name}-${idx}`}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <span
                              className={cn(
                                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                                badgeCls
                              )}
                            >
                              {ext}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                              {file.name}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">{sizeLabel}</span>
                            <span className="shrink-0 text-xs font-medium text-green-600">✓ Prêt</span>
                            <button
                              type="button"
                              aria-label={`Supprimer ${file.name}`}
                              onClick={() =>
                                setNewFiles((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            >
                              ✕
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {newFiles.length === 0 && (
                    <p className="text-center text-xs text-slate-400">
                      Aucun fichier sélectionné — vous pouvez passer cette étape.
                    </p>
                  )}
                </div>
              )}

              {step === 5 && (
                <Card className="rounded-lg border-l-4 border-l-cyan p-4 text-sm space-y-1">
                  <p><span className="font-medium">Domaine :</span> {form.domain ? domainLabels[form.domain] : "-"}</p>
                  <p><span className="font-medium">Urgence :</span> {form.urgency}</p>
                  <p><span className="font-medium">Description :</span> {form.description || "-"}</p>
                  <p><span className="font-medium">Documents :</span> {newFiles.length > 0 ? `${newFiles.length} fichier(s)` : "Aucun"}</p>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setStep((prev) => Math.max(1, prev - 1))} disabled={step === 1}>
                  Précédent
                </Button>
                {step < 5 ? (
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={() => setStep((prev) => Math.min(5, prev + 1))}
                    disabled={
                      (step === 1 && !form.domain) ||
                      (step === 2 && form.description.trim().length < 10)
                    }
                  >
                    {step === 4 ? (newFiles.length > 0 ? "Suivant" : "Passer cette étape") : "Suivant"}
                  </Button>
                ) : (
                  <Button
                    className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={submitNewDemand}
                    disabled={submitting}
                  >
                    {submitting ? "Envoi..." : "Soumettre la demande"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}