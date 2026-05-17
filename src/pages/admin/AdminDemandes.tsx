import { useState, useEffect } from "react";
import {
  UserCheck, Clock, AlertTriangle, Check, X,
  ChevronDown, Eye, FileText, User, Mail,
  Phone, Tag, MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/services/api";

// ── Types ────────────────────────────────────────────────────
interface Demande {
  id: string;
  reference: string;
  domain: string;
  domain_display: string;
  description: string;
  urgency: "normale" | "urgente" | "critique";
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  assigned_to_name: string | null;
  assigned_at?: string | null;
  internal_notes?: string;
  conclusion?: string;
  documents_count?: number;
  consultations_count?: number;
}

interface Expert {
  id: string;
  first_name: string;
  last_name: string;
  speciality: string;
  is_active: boolean;
}

// ── Styles ───────────────────────────────────────────────────
const URGENCY_STYLES: Record<string, string> = {
  normale:  "bg-slate-100 text-slate-700",
  urgente:  "bg-amber-100 text-amber-700",
  critique: "bg-red-100 text-red-700",
};
const STATUS_STYLES: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-700",
  assignee:   "bg-blue-100 text-blue-700",
  en_cours:   "bg-purple-100 text-purple-700",
  traitee:    "bg-emerald-100 text-emerald-700",
  annulee:    "bg-slate-100 text-slate-500",
};

// ── Helpers ──────────────────────────────────────────────────
function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  if (h > 0)   return `${h}h${m > 0 ? m + "m" : ""}`;
  return `${m}m`;
}

function isOverdue(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() > 2 * 3600000;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── FIX 1 : URL correcte, pas de boucle fragile ──────────────
async function fetchExperts(): Promise<Expert[]> {
  try {
    const res = await api.get("/auth/staff/experts/");
    const data: Expert[] = res.data?.results ?? res.data ?? [];
    return data.filter((u: any) => u.is_active !== false);
  } catch (e) {
    console.error("Impossible de charger les experts", e);
    return [];
  }
}

// ════════════════════════════════════════════════════════════
// PANNEAU DÉTAIL
// ════════════════════════════════════════════════════════════
function DossierDetailPanel({
  demande, experts, onClose, onAssigned,
}: {
  demande: Demande;
  experts: Expert[];
  onClose: () => void;
  onAssigned: () => Promise<void>;
}) {
  const [selectedExpert, setSelectedExpert] = useState("");
  const [saving, setSaving]                 = useState(false);
  const [err, setErr]                       = useState("");
  const [ok, setOk]                         = useState("");
  const over = demande.status === "en_attente" && isOverdue(demande.created_at);

  const handleAssign = async () => {
    if (!selectedExpert) { setErr("Veuillez choisir un expert."); return; }
    setSaving(true); setErr("");
    try {
      await api.post(`/demandes/${demande.id}/assign/`, { assigned_to: selectedExpert });
      setOk("Dossier assigné ✓");
      // FIX 3 : attendre le rechargement avant de fermer
      await onAssigned();
      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      setErr(
        e?.response?.data?.assigned_to?.[0] ||
        e?.response?.data?.detail ||
        getApiErrorMessage(e, "Erreur lors de l'assignation")
      );
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col">

        {/* En-tête */}
        <div className={`px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 ${over ? "bg-red-50" : ""}`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                {demande.reference}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${URGENCY_STYLES[demande.urgency]}`}>
                {demande.urgency}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[demande.status]}`}>
                {demande.status_display}
              </span>
              {over && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                  <AlertTriangle className="h-3 w-3" /> En retard
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Créé le {fmtDate(demande.created_at)} · il y a {timeSince(demande.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <section>
            <SectionTitle icon={<FileText className="h-3.5 w-3.5" />} label="Description du dossier" />
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {demande.description}
              </p>
            </div>
          </section>

          <section>
            <SectionTitle icon={<Tag className="h-3.5 w-3.5" />} label="Informations" />
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Domaine"      value={demande.domain_display} />
              <InfoBox label="Délai écoulé" value={timeSince(demande.created_at)} highlight={over} />
              {demande.documents_count !== undefined && (
                <InfoBox label="Documents"    value={`${demande.documents_count} fichier(s)`} />
              )}
              {demande.consultations_count !== undefined && (
                <InfoBox label="Consultations" value={`${demande.consultations_count}`} />
              )}
            </div>
          </section>

          <section>
            <SectionTitle icon={<User className="h-3.5 w-3.5" />} label="Client" />
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-2.5">
              <Row icon={<User className="h-4 w-4 text-slate-400" />}   text={demande.client_name} bold />
              <Row icon={<Mail className="h-4 w-4 text-slate-400" />}   text={demande.client_email} />
              {demande.client_phone && (
                <Row icon={<Phone className="h-4 w-4 text-slate-400" />} text={demande.client_phone} />
              )}
            </div>
          </section>

          {demande.assigned_to_name && (
            <section>
              <SectionTitle icon={<UserCheck className="h-3.5 w-3.5" />} label="Expert actuellement assigné" />
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 px-4 py-3">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  {demande.assigned_to_name}
                </span>
                {demande.assigned_at && (
                  <span className="ml-auto text-xs text-emerald-600">
                    le {fmtDate(demande.assigned_at)}
                  </span>
                )}
              </div>
            </section>
          )}

          {demande.internal_notes && (
            <section>
              <SectionTitle icon={<MessageSquare className="h-3.5 w-3.5" />} label="Notes internes" />
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{demande.internal_notes}</p>
              </div>
            </section>
          )}

          {demande.conclusion && (
            <section>
              <SectionTitle icon={<Check className="h-3.5 w-3.5" />} label="Conclusion" />
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{demande.conclusion}</p>
              </div>
            </section>
          )}
        </div>

        {/* Footer assignation */}
        {demande.status !== "traitee" && demande.status !== "annulee" && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {demande.assigned_to_name ? "Réassigner à un expert" : "Assigner à un expert"}
            </p>
            {experts.length === 0 ? (
              <p className="text-sm text-red-500">Aucun expert disponible. Créez d'abord des experts.</p>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedExpert}
                    onChange={e => { setSelectedExpert(e.target.value); setErr(""); }}
                    className="w-full appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">-- Choisir un expert --</option>
                    {experts.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}{e.speciality ? ` · ${e.speciality}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <Button
                  disabled={saving || !selectedExpert}
                  onClick={handleAssign}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white whitespace-nowrap"
                >
                  {saving ? "..." : "Confirmer"}
                </Button>
              </div>
            )}
            {err && <p className="text-xs text-red-500">{err}</p>}
            {ok  && <p className="text-xs text-emerald-600 font-medium">{ok}</p>}
          </div>
        )}
      </div>
    </>
  );
}

// ── Petits composants ────────────────────────────────────────
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
      {icon}{label}
    </div>
  );
}

function InfoBox({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-red-600" : "text-slate-800 dark:text-slate-200"}`}>{value}</p>
    </div>
  );
}

function Row({ icon, text, bold = false }: { icon: React.ReactNode; text: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={`text-sm ${bold ? "font-medium text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"}`}>
        {text}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function AdminDemandes() {
  const [demandes, setDemandes]   = useState<Demande[]>([]);
  const [experts, setExperts]     = useState<Expert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [filter, setFilter]       = useState<"all" | "en_attente" | "assignee" | "en_cours">("all");
  const [selected, setSelected]   = useState<Demande | null>(null);

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
    else         { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
  };

  useEffect(() => {
    loadDemandes();
    fetchExperts().then(setExperts);
  }, []);

  // FIX 3 : retourne Promise<Demande[]> pour que onAssigned puisse await
  const loadDemandes = async (): Promise<Demande[]> => {
    try {
      setIsLoading(true);
      const res = await api.get("/demandes/", {
        params: { page_size: 100, ordering: "-created_at" },
      });
      const data: Demande[] = res.data?.results ?? res.data ?? [];
      setDemandes(data);
      return data;
    } catch (err) {
      flash(getApiErrorMessage(err, "Erreur lors du chargement"), true);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const filtered  = demandes.filter(d => filter === "all" || d.status === filter);
  const enAttente = demandes.filter(d => d.status === "en_attente").length;
  const overdue   = demandes.filter(d => d.status === "en_attente" && isOverdue(d.created_at)).length;
  const assignees = demandes.filter(d => d.status === "assignee").length;

  return (
    <>
      <div className="space-y-6">

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)}><X className="h-4 w-4 text-red-600" /></button>
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <p className="text-sm text-emerald-700">{success}</p>
          </div>
        )}

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">En attente</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{enAttente}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">Assignés</p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{assignees}</p>
          </div>
          <div className={`rounded-xl border p-4 ${overdue > 0 ? "bg-red-50 border-red-200" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"}`}>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              {overdue > 0 && <AlertTriangle className="h-3 w-3 text-red-500" />}En retard (&gt;2h)
            </p>
            <p className={`text-2xl font-semibold ${overdue > 0 ? "text-red-600" : "text-slate-900 dark:text-white"}`}>{overdue}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "en_attente", "assignee", "en_cours"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f ? "bg-cyan-500 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50"
              }`}>
              {f === "all" ? "Tous" : f === "en_attente" ? "En attente" : f === "assignee" ? "Assignés" : "En cours"}
            </button>
          ))}
        </div>

        {/* Liste dossiers */}
        <Card>
          <CardHeader>
            <CardTitle>Dossiers ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Aucun dossier</div>
            ) : (
              <div className="space-y-3">
                {filtered.map(demande => {
                  const over = demande.status === "en_attente" && isOverdue(demande.created_at);
                  return (
                    <div key={demande.id}
                      onClick={() => setSelected(demande)}
                      className={`rounded-xl border p-4 cursor-pointer transition hover:shadow-md ${
                        over
                          ? "border-red-200 bg-red-50/50"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-300"
                      }`}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{demande.reference}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[demande.urgency]}`}>{demande.urgency}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[demande.status] ?? ""}`}>{demande.status_display}</span>
                            {over && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
                                <AlertTriangle className="h-3 w-3" /> En retard
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{demande.description}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>{demande.domain_display}</span>
                            <span>·</span>
                            <span>Client : {demande.client_name}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeSince(demande.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {demande.assigned_to_name && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
                              <UserCheck className="h-3.5 w-3.5" />{demande.assigned_to_name}
                            </div>
                          )}
                          <Button size="sm" variant="outline"
                            className="border-cyan-300 text-cyan-600 hover:bg-cyan-50"
                            onClick={e => { e.stopPropagation(); setSelected(demande); }}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Voir
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panneau détail latéral */}
      {selected && (
        <DossierDetailPanel
          demande={selected}
          experts={experts}
          onClose={() => setSelected(null)}
          // FIX 3 : async — attend le rechargement, met à jour selected
          onAssigned={async () => {
            const fresh = await loadDemandes();
            const updated = fresh.find(d => d.id === selected?.id);
            if (updated) setSelected(updated);
            flash("Dossier assigné avec succès ✓");
          }}
        />
      )}
    </>
  );
}