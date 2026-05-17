/**
 * DossierLifecycle.tsx
 * ═══════════════════════════════════════════════════════════
 * Composant State Machine — cycle de vie d'un dossier Justia
 *
 * Affiche :
 *   ① Timeline des étapes (en_attente → assignee → en_cours → en_revision → traitee)
 *   ② Boutons de transition selon le rôle de l'utilisateur
 *   ③ Historique des changements de statut
 *
 * Usage dans DossierDetailPanel :
 *   <DossierLifecycle dossierId={demande.id} userRole="expert" onTransitioned={reload} />
 * ═══════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Circle, ArrowRight,
  Clock, AlertCircle, Loader2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/services/api";

// ── Types ────────────────────────────────────────────────────
interface StatusInfo  { value: string; label: string; color: string; }
interface TimelineStep { status: string; label: string; color: string; completed: boolean; current: boolean; }
interface HistoryEntry { from_label: string; to_label: string; created_at: string; }

interface LifecycleData {
  reference:             string;
  current_status:        StatusInfo;
  available_transitions: StatusInfo[];
  is_final:              boolean;
  is_cancelled:          boolean;
  timeline:              TimelineStep[];
  history:               HistoryEntry[];
}

// ── Couleurs Tailwind ────────────────────────────────────────
const C: Record<string, { dot: string; ring: string; badge: string; badgeText: string }> = {
  yellow:  { dot: "bg-yellow-400",  ring: "ring-yellow-300",  badge: "bg-yellow-100",  badgeText: "text-yellow-700" },
  blue:    { dot: "bg-blue-500",    ring: "ring-blue-300",    badge: "bg-blue-100",    badgeText: "text-blue-700"   },
  purple:  { dot: "bg-purple-500",  ring: "ring-purple-300",  badge: "bg-purple-100",  badgeText: "text-purple-700" },
  amber:   { dot: "bg-amber-400",   ring: "ring-amber-300",   badge: "bg-amber-100",   badgeText: "text-amber-700"  },
  emerald: { dot: "bg-emerald-500", ring: "ring-emerald-300", badge: "bg-emerald-100", badgeText: "text-emerald-700"},
  slate:   { dot: "bg-slate-400",   ring: "ring-slate-300",   badge: "bg-slate-100",   badgeText: "text-slate-600"  },
};

function Badge({ s }: { s: StatusInfo }) {
  const c = C[s.color] ?? C.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${c.badge} ${c.badgeText}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {s.label}
    </span>
  );
}

// ── Timeline ─────────────────────────────────────────────────
function Timeline({ steps, isCancelled }: { steps: TimelineStep[]; isCancelled: boolean }) {
  return (
    <div className="relative">
      {isCancelled && (
        <div className="flex items-center gap-2 mb-3 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2">
          <XCircle className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Dossier annulé</span>
        </div>
      )}
      <div className="flex items-start gap-0 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const c = C[step.color] ?? C.slate;
          return (
            <div key={step.status} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16">
                {/* Cercle */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                  ${step.current
                    ? `bg-white dark:bg-slate-900 border-current ${c.badgeText} ring-2 ${c.ring} ring-offset-2`
                    : step.completed
                      ? `${c.badge} border-transparent`
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  }
                `}>
                  {step.completed && !step.current
                    ? <CheckCircle2 className={`h-4 w-4 ${c.badgeText}`} />
                    : step.current
                      ? <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      : <Circle className="h-4 w-4 text-slate-300" />
                  }
                </div>
                {/* Label */}
                <span className={`text-center text-[10px] leading-tight font-medium ${
                  step.current ? c.badgeText : step.completed ? "text-slate-600 dark:text-slate-400" : "text-slate-400"
                }`}>
                  {step.label}
                </span>
              </div>
              {/* Connecteur */}
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mb-5 ${steps[i + 1].completed ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Historique ────────────────────────────────────────────────
function History({ entries }: { entries: HistoryEntry[] }) {
  if (!entries.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        Historique
      </p>
      <div className="space-y-1.5 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
        {entries.map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{new Date(h.created_at).toLocaleDateString("fr-FR", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}</span>
            <span className="font-medium text-slate-600 dark:text-slate-300">{h.from_label}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium text-slate-600 dark:text-slate-300">{h.to_label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════
interface Props {
  dossierId:       string;
  userRole:        "client" | "expert" | "admin";
  onTransitioned?: () => void;
}

export default function DossierLifecycle({ dossierId, userRole, onTransitioned }: Props) {
  const [data, setData]           = useState<LifecycleData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [loadErr, setLoadErr]     = useState<string | null>(null);
  const [transitioning, setTrans] = useState(false);
  const [txErr, setTxErr]         = useState<string | null>(null);
  const [txOk, setTxOk]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(null);
    try {
      const res = await api.get(`/demandes/${dossierId}/lifecycle/`);
      setData(res.data);
    } catch (e) {
      setLoadErr(getApiErrorMessage(e, "Impossible de charger le cycle de vie."));
    } finally { setLoading(false); }
  }, [dossierId]);

  useEffect(() => { load(); }, [load]);

  const handleTransition = async (target: StatusInfo) => {
    if (!confirm(`Confirmer : passer à «${target.label}» ?`)) return;
    setTrans(true); setTxErr(null); setTxOk(null);
    try {
      const res = await api.post(`/demandes/${dossierId}/transition/`, { status: target.value });
      setTxOk(res.data.message ?? `Transition vers «${target.label}» effectuée.`);
      await load();
      onTransitioned?.();
      setTimeout(() => setTxOk(null), 3000);
    } catch (e: any) {
      setTxErr(
        e?.response?.data?.detail ||
        getApiErrorMessage(e, "Erreur lors de la transition.")
      );
    } finally { setTrans(false); }
  };

  // ── Rendu ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center gap-2 text-slate-400 py-3 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" /> Chargement du cycle de vie...
    </div>
  );

  if (loadErr || !data) return (
    <div className="flex items-center gap-2 text-red-500 text-sm py-2">
      <AlertCircle className="h-4 w-4" /> {loadErr ?? "Erreur inconnue."}
    </div>
  );

  return (
    <div className="space-y-4">

      {/* État actuel */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 dark:text-slate-400">État actuel :</span>
        <Badge s={data.current_status} />
        {data.is_final && !data.is_cancelled && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Dossier clôturé
          </span>
        )}
      </div>

      {/* Timeline */}
      <Timeline steps={data.timeline} isCancelled={data.is_cancelled} />

      {/* Boutons transition */}
      {!data.is_final && data.available_transitions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Action disponible
          </p>
          <div className="flex gap-2 flex-wrap">
            {data.available_transitions.map(t => (
              <Button key={t.value} size="sm"
                disabled={transitioning}
                onClick={() => handleTransition(t)}
                className={t.value === "annulee"
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-cyan-500 hover:bg-cyan-600 text-white"
                }
              >
                {transitioning
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />En cours...</>
                  : <><ArrowRight className="h-3.5 w-3.5 mr-1.5" />→ {t.label}</>
                }
              </Button>
            ))}
          </div>

          {txErr && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{txErr}</p>
            </div>
          )}
          {txOk && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-700">{txOk}</p>
            </div>
          )}
        </div>
      )}

      {/* Historique */}
      <History entries={data.history} />
    </div>
  );
}