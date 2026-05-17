import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api, getApiErrorMessage } from "@/services/api";
import { useSearchParams } from "react-router-dom";

type KanbanStatus = "nouveau" | "assigne" | "en_cours" | "en_revision" | "cloture";
type Urgency = "critique" | "urgente" | "normale";

type DemandeItem = {
  id: string;
  client: string;
  reference: string;
  domain: string;
  urgency: Urgency;
  status: KanbanStatus;
  statusDisplay: string;
  apiStatus: string;
  assignedTo?: string;
  dueDate: string;
  documents: number;
  email: string;
  phone: string;
  details: string;
};

type ApiDemandeListRow = {
  id: string;
  reference: string;
  domain: string;
  domain_display: string;
  description: string;
  urgency: Urgency;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  assigned_to_name: string | null;
  documents_count: number;
  consultations_count: number;
};

// ✅ Type pour les messages
type Message = {
  id: string;
  content: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
};

function apiStatusToKanban(s: string): KanbanStatus {
  switch (s) {
    case "en_attente": return "nouveau";
    case "assignee": return "assigne";
    case "en_cours": return "en_cours";
    case "en_revision": return "en_revision";
    case "traitee": return "cloture";
    case "annulee": return "cloture";
    default: return "nouveau";
  }
}

function mapKanbanToApiStatus(k: KanbanStatus): string {
  const m: Record<KanbanStatus, string> = {
    nouveau: "en_attente",
    assigne: "assignee",
    en_cours: "en_cours",
    en_revision: "en_revision",
    cloture: "traitee",
  };
  return m[k];
}

function mapApiToDemandeItem(row: ApiDemandeListRow): DemandeItem {
  return {
    id: row.id,
    client: row.client_name || "Client",
    reference: row.reference,
    domain: row.domain_display || row.domain,
    urgency: row.urgency,
    status: apiStatusToKanban(row.status),
    statusDisplay: row.status_display,
    apiStatus: row.status,
    assignedTo: row.assigned_to_name ?? undefined,
    dueDate: row.updated_at || row.created_at,
    documents: row.documents_count,
    email: row.client_email || "",
    phone: row.client_phone || "",
    details: row.description || "",
  };
}

const columns: { id: KanbanStatus; label: string }[] = [
  { id: "nouveau", label: "Nouveau" },
  { id: "assigne", label: "Assigne" },
  { id: "en_cours", label: "En cours" },
  { id: "en_revision", label: "En revision" },
  { id: "cloture", label: "Cloture" },
];

const teamMembers: string[] = [];

function KanbanCard({ demande, onOpen }: { demande: DemandeItem; onOpen: (item: DemandeItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: demande.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  const urgencyStyle = demande.urgency === "critique" ? "border-l-red-500" : demande.urgency === "urgente" ? "border-l-amber-500" : "border-l-transparent";
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(demande)}
      className={cn("cursor-grab rounded-xl border border-slate-200 border-l-4 bg-white p-3 shadow-sm transition hover:shadow", urgencyStyle, isDragging && "opacity-70")}
    >
      <p className="text-sm font-semibold">{demande.client}</p>
      <p className="text-xs text-slate-500">{demande.reference}</p>
      <div className="mt-2 flex items-center justify-between">
        <Badge variant="outline">{demande.domain}</Badge>
        <span className="text-xs text-slate-500">{demande.documents} docs</span>
      </div>
      <p className="mt-2 text-xs text-slate-600">{demande.assignedTo || "Non assigne"}</p>
      <p className="text-xs text-slate-500">Echeance: {new Date(demande.dueDate).toLocaleDateString("fr-FR")}</p>
    </div>
  );
}

function Column({ id, label, children }: { id: KanbanStatus; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("rounded-xl border border-slate-200 bg-slate-50 p-3", isOver && "border-cyan bg-cyan-50/40")}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function FournisseurDemandes() {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [demandes, setDemandes] = useState<DemandeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DemandeItem | null>(null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultation, setConsultation] = useState({
    datetime: "",
    duration: "45",
    meetingType: "Visio",
    autoSend: true,
  });
  const [showReportModal, setShowReportModal] = useState(false);
const [report, setReport] = useState({ notes: "", report: "" });
const [isSavingReport, setIsSavingReport] = useState(false);

  // ✅ État des messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<{ count: number; results: ApiDemandeListRow[] }>("/demandes/", {
        params: { page_size: 100 },
      });
      const rows = (data.results ?? []).filter((r) => r.status !== "annulee");
      setDemandes(rows.map(mapApiToDemandeItem));
    } catch (e) {
      setLoadError(getApiErrorMessage(e, "Impossible de charger les demandes."));
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  const id = searchParams.get("id");
  if (id && demandes.length > 0) {
    const found = demandes.find((d) => d.id === id);
    if (found) setSelected(found);
  }
}, [loading, demandes, searchParams]);

  // ✅ Charger les messages quand une demande est sélectionnée
  const fetchMessages = useCallback(async (demandeId: string) => {
    setMessagesLoading(true);
    try {
      const { data } = await api.get(`/demandes/${demandeId}/messages/`);
      const results = data.results ?? data ?? [];
      setMessages(results);
      // Scroll vers le bas après chargement
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDemandes();
  }, [fetchDemandes]);

  // ✅ Recharger les messages quand la demande sélectionnée change
  useEffect(() => {
    if (selected) {
      void fetchMessages(selected.id);
    } else {
      setMessages([]);
    }
  }, [selected, fetchMessages]);

  const byColumn = useMemo(
    () => columns.reduce((acc, col) => ({ ...acc, [col.id]: demandes.filter((d) => d.status === col.id) }), {} as Record<KanbanStatus, DemandeItem[]>),
    [demandes]
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as KanbanStatus;
    const id = String(active.id);
    const apiStatus = mapKanbanToApiStatus(newStatus);
    const prev = demandes;
    setDemandes((p) => p.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    try {
      await api.patch(`/demandes/${id}/`, { status: apiStatus });
      void fetchDemandes();
    } catch {
      setDemandes(prev);
    }
  };

  const updateSelected = (updater: (current: DemandeItem) => DemandeItem) => {
    setSelected((prev) => (prev ? updater(prev) : prev));
    setDemandes((prev) => prev.map((item) => (selected && item.id === selected.id ? updater(item) : item)));
  };

  // ✅ Envoyer un message et rafraîchir le fil
  const sendMessage = async () => {
    if (!message.trim() || !selected || isSending) return;
    setIsSending(true);
    try {
      await api.post(`/demandes/${selected.id}/messages/`, {
        content: message.trim(),
      });
      setMessage("");
      await fetchMessages(selected.id);
    } catch (err) {
      alert(getApiErrorMessage(err, "Erreur lors de l'envoi"));
    } finally {
      setIsSending(false);
    }
  };
  

  return (
    
    <div className="space-y-4">
      {loadError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
      )}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="font-semibold text-slate-900">Gestion des demandes</p>
          <div className="flex gap-2">
            <Button variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")} className={cn(view === "kanban" && "bg-cyan text-white hover:bg-cyan/90")}>Kanban</Button>
            <Button variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")} className={cn(view === "table" && "bg-cyan text-white hover:bg-cyan/90")}>Table</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chargement des demandes...</p>
      ) : view === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid gap-3 xl:grid-cols-5">
            {columns.map((column) => (
              <Column key={column.id} id={column.id} label={column.label}>
                {byColumn[column.id].map((demande) => (
                  <KanbanCard key={demande.id} demande={demande} onOpen={setSelected} />
                ))}
              </Column>
            ))}
          </div>
        </DndContext>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Domaine</th>
                  <th className="px-4 py-3">Urgence</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Assigne</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {demandes.map((demande) => (
                  <tr key={demande.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{demande.client}</td>
                    <td className="px-4 py-3">{demande.reference}</td>
                    <td className="px-4 py-3">{demande.domain}</td>
                    <td className="px-4 py-3">{demande.urgency}</td>
                    <td className="px-4 py-3">{demande.statusDisplay}</td>
                    <td className="px-4 py-3">{demande.assignedTo || "Non assigne"}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => setSelected(demande)}>Voir detail</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/40">
          <aside className="ml-auto h-full w-full max-w-[520px] overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{selected.reference} - {selected.client}</p>
                <p className="text-sm text-slate-500">{selected.domain}</p>
              </div>
              <Button variant="ghost" onClick={() => setSelected(null)}>Fermer</Button>
            </div>

            <Card className="mb-4">
              <CardHeader><CardTitle className="text-base">Informations client</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Email: {selected.email}</p>
                <p>Telephone: {selected.phone}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline">Appeler</Button>
                  <Button size="sm" variant="outline">Envoyer email</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader><CardTitle className="text-base">Details de la demande</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{selected.details}</p>
                <p>Documents joints: {selected.documents}</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Assignation</p>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                      value={selected.assignedTo || ""}
                      onChange={(event) => updateSelected((curr) => ({ ...curr, assignedTo: event.target.value }))}
                    >
                      <option value="">Non assigne</option>
                      {teamMembers.map((member) => <option key={member} value={member}>{member}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Statut</p>
                    <select
                      className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                      value={selected.status}
                      onChange={(event) => updateSelected((curr) => ({ ...curr, status: event.target.value as KanbanStatus }))}
                    >
                      {columns.map((col) => <option key={col.id} value={col.id}>{col.label}</option>)}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader><CardTitle className="text-base">Timeline editable</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Demande recue: 30/03/2026 09:12</p>
                <p>Assignation: {selected.assignedTo || "A definir"}</p>
                <p>Statut courant: {selected.statusDisplay}</p>
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader><CardTitle className="text-base">Notes internes</CardTitle></CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Visible uniquement equipe JUSTIA..."
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>

            {/* ✅ Fil de messages — charge les vrais messages depuis l'API */}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">Fil de messages client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                {/* Zone des messages */}
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  {messagesLoading ? (
                    <p className="text-center text-xs text-slate-400">Chargement des messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-xs text-slate-400">Aucun message pour cette demande.</p>
                  ) : (
                    messages.map((msg) => {
                      const isExpert = msg.sender_role === "expert" || msg.sender_role === "fournisseur";
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                            isExpert
                              ? "ml-auto bg-cyan/10 text-slate-800 text-right"
                              : "bg-white border border-slate-200 text-slate-700"
                          )}
                        >
                          {/* Nom de l'expéditeur */}
                          <p className={cn("text-xs font-medium mb-1", isExpert ? "text-cyan" : "text-slate-500")}>
                            {msg.sender_name}
                          </p>
                          {/* Contenu */}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {/* Heure */}
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
                  {/* Ancre pour scroll automatique */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Zone de saisie */}
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ecrire un message au client..."
                  className="min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      void sendMessage();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Ctrl+Entrée pour envoyer</p>
                  <Button
                    size="sm"
                    className="bg-cyan text-white hover:bg-cyan/90"
                    onClick={sendMessage}
                    disabled={!message.trim() || isSending}
                  >
                    {isSending ? "Envoi..." : "Envoyer"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button 
  className="bg-cyan text-white hover:bg-cyan/90"
  onClick={() => setShowReportModal(true)}  // ✅
>
  Ajouter compte-rendu
</Button>
              <Button variant="outline" onClick={() => setShowConsultationModal(true)}>Planifier une consultation</Button>
            </div>
          </aside>
        </div>
      )}

      {showConsultationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-xl">
            <CardHeader>
              <CardTitle>Planifier une consultation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  type="datetime-local"
                  value={consultation.datetime}
                  onChange={(event) => setConsultation((prev) => ({ ...prev, datetime: event.target.value }))}
                />
                <select
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm"
                  value={consultation.duration}
                  onChange={(event) => setConsultation((prev) => ({ ...prev, duration: event.target.value }))}
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>
              <select
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
                value={consultation.meetingType}
                onChange={(event) => setConsultation((prev) => ({ ...prev, meetingType: event.target.value }))}
              >
                <option>Visio</option>
                <option>Presentiel</option>
                <option>Telephone</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consultation.autoSend}
                  onChange={(event) => setConsultation((prev) => ({ ...prev, autoSend: event.target.checked }))}
                />
                Envoyer automatiquement l'email de confirmation
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConsultationModal(false)}>Annuler</Button>
                <Button
                  className="bg-cyan text-white hover:bg-cyan/90"
                  onClick={async () => {
                    if (!consultation.datetime || !selected) return;
                    try {
                      const meRes = await api.get("/auth/me/");
                      const expertId = meRes.data.id;
                      const typeMap: Record<string, string> = {
                        "Visio": "visio",
                        "Presentiel": "presentiel",
                        "Telephone": "telephone",
                      };
                      await api.post("/consultations/", {
                        demande: selected.id,
                        expert: expertId,
                        scheduled_at: new Date(consultation.datetime).toISOString(),
                        duration: parseInt(consultation.duration),
                        consultation_type: typeMap[consultation.meetingType] ?? "visio",
                      });
                      setShowConsultationModal(false);
                      alert("✅ Consultation planifiée !");
                    } catch (e: any) {
                      const err = e?.response?.data;
                      alert(
                        err?.detail ||
                        err?.scheduled_at?.[0] ||
                        err?.non_field_errors?.[0] ||
                        JSON.stringify(err) ||
                        "Erreur lors de la planification"
                      );
                    }
                  }}
                >
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    
  {showReportModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Compte-rendu — {selected.reference}</CardTitle>
              <Button variant="ghost" onClick={() => setShowReportModal(false)}>Fermer</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Notes internes</label>
                <Textarea
                  value={report.notes}
                  onChange={e => setReport(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes visibles uniquement par l'équipe..."
                  className="min-h-[100px]"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Rapport final (visible par le client)</label>
                <Textarea
                  value={report.report}
                  onChange={e => setReport(prev => ({ ...prev, report: e.target.value }))}
                  placeholder="Conclusions et recommandations..."
                  className="min-h-[120px]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReportModal(false)}>Annuler</Button>
                <Button
                  className="bg-cyan text-white hover:bg-cyan/90"
                  disabled={isSavingReport}
                  onClick={async () => {
                    setIsSavingReport(true);
                    try {
                      const consRes = await api.get("/consultations/", {
                        params: { demande: selected.id }
                      });
                      const consultations = consRes.data?.results ?? consRes.data ?? [];
                      if (consultations.length === 0) {
                        alert("Aucune consultation liée à ce dossier.");
                        return;
                      }
                      const lastConsult = consultations[0];
                      await api.post(`/consultations/${lastConsult.id}/report/`, {
                        notes: report.notes,
                        report: report.report,
                      });
                      setShowReportModal(false);
                      setReport({ notes: "", report: "" });
                      alert("Compte-rendu enregistré ✓");
                    } catch (err: any) {
                      alert(err?.response?.data?.detail || "Erreur lors de l'enregistrement.");
                    } finally {
                      setIsSavingReport(false);
                    }
                  }}
                >
                  {isSavingReport ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
  

