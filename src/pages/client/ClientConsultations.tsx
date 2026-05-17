import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/pages/client/DashboardContext";
import type { Consultation } from "@/types/client";
import { api } from "@/services/api";

const consultationStatusLabel: Record<string, string> = {
  planifiee: "Planifiee",
  en_cours: "En cours",
  terminee: "Terminee",
  annulee: "Annulee",
};

type ModalType = "reprogrammer" | "annuler" | null;
interface ModalState {
  type: ModalType;
  consultation: Consultation | null;
}

// ✅ Mapper les données API vers le type Consultation
function mapApiToConsultation(c: any): Consultation {
  return {
    ...c,
    scheduledAt: c.scheduled_at ?? c.scheduledAt,
    demande: c.demande,
    meetingUrl: c.meeting_url ?? null,
    duration: c.duration,
    status: c.status,
    rating: c.rating ?? null,
    rating_comment: c.rating_comment ?? "",
    report: c.report ?? null,
    notes: c.notes ?? null,
    expert: c.expert_name ? {
      id: c.expert ?? "",
      firstName: c.expert_name.split(" ")[0] ?? "",
      lastName: c.expert_name.split(" ").slice(1).join(" ") ?? "",
      specialization: [],
      rating: 0,
    } : null,
  };
}

export default function ClientConsultations() {
  const { consultations: initialConsultations } = useDashboard();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [activeTab, setActiveTab] = useState<"avenir" | "passees">("avenir");
  const [loading, setLoading] = useState(true);

  // Modale
  const [modal, setModal] = useState<ModalState>({ type: null, consultation: null });
  const [modalMessage, setModalMessage] = useState("");
  const [modalDate, setModalDate] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [modalError, setModalError] = useState("");

  // Notation
  const [hoverRating, setHoverRating] = useState<Record<string, number>>({});
  const [pendingRating, setPendingRating] = useState<Record<string, number>>({});
  const [ratingComment, setRatingComment] = useState<Record<string, string>>({});
  const [isRating, setIsRating] = useState<Record<string, boolean>>({});

  // ✅ Charger depuis l'API
  const loadConsultations = async () => {
    try {
      const res = await api.get("/consultations/");
      const raw = res.data?.results ?? res.data ?? [];
      setConsultations(raw.filter((c: any) => c && (c.scheduled_at || c.scheduledAt)).map(mapApiToConsultation));
    } catch {
      setConsultations(initialConsultations.filter((c) => c && c.scheduledAt));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsultations();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return consultations.filter((consultation) => {
      const ts = consultation.scheduledAt ? new Date(consultation.scheduledAt).getTime() : 0;
      const isPast = isNaN(ts) || ts < now || consultation.status === "terminee" || consultation.status === "annulee";
      const tabMatch = activeTab === "avenir" ? !isPast : isPast;
      const statusMatch = statusFilter === "tous" || consultation.status === statusFilter;
      return tabMatch && statusMatch;
    });
  }, [consultations, activeTab, statusFilter]);

  const getCountdown = (isoDate: string | undefined | null) => {
    if (!isoDate) return { canJoin: false, text: "" };
    const delta = new Date(isoDate).getTime() - Date.now();
    if (isNaN(delta)) return { canJoin: false, text: "" };
    const canJoin = delta <= 15 * 60 * 1000 && delta > -60 * 60 * 1000;
    const hours = Math.max(0, Math.floor(delta / 3600000));
    const mins = Math.max(0, Math.floor((delta % 3600000) / 60000));
    return { canJoin, text: `Dans ${hours}h ${mins}min` };
  };

  const openModal = (type: ModalType, consultation: Consultation) => {
    setModal({ type, consultation });
    setModalMessage("");
    setModalDate("");
    setModalError("");
  };

  const closeModal = () => {
    setModal({ type: null, consultation: null });
    setModalMessage("");
    setModalDate("");
    setModalError("");
  };

  const handleSendMessage = async () => {
    const { type, consultation } = modal;
    if (!consultation) return;
    if (type === "reprogrammer" && !modalDate) {
      setModalError("Veuillez indiquer une date souhaitée.");
      return;
    }
    if (!modalMessage.trim()) {
      setModalError("Veuillez écrire un message.");
      return;
    }
    setIsSending(true);
    setModalError("");
    try {
      const dateConsultation = new Date(consultation.scheduledAt).toLocaleString("fr-FR");
      const content =
        type === "reprogrammer"
          ? `Demande de reprogrammation pour la consultation du ${dateConsultation}.\nNouveau créneau souhaité : ${modalDate}.\nMessage : ${modalMessage}`
          : `Demande d'annulation pour la consultation du ${dateConsultation}.\nMotif : ${modalMessage}`;
      await api.post(`/demandes/${consultation.demande}/messages/`, { content });
      closeModal();
      alert(
        type === "reprogrammer"
          ? "Votre demande de reprogrammation a été envoyée à l'expert ✓"
          : "Votre demande d'annulation a été envoyée à l'expert ✓"
      );
    } catch {
      setModalError("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setIsSending(false);
    }
  };

  // ✅ Envoi de la note + rechargement depuis l'API
  const handleSubmitRating = async (consultationId: string) => {
    const rating = pendingRating[consultationId];
    if (!rating) return;
    setIsRating((r) => ({ ...r, [consultationId]: true }));
    try {
      await api.post(`/consultations/${consultationId}/rate/`, {
        rating,
        rating_comment: ratingComment[consultationId] ?? "",
      });

      // ✅ Recharger depuis l'API
      await loadConsultations();

      // Nettoyer
      setPendingRating((p) => { const n = { ...p }; delete n[consultationId]; return n; });
      setRatingComment((r) => { const n = { ...r }; delete n[consultationId]; return n; });
      alert("✅ Votre note a été enregistrée !");
   // Dans handleSubmitRating, changez le catch :
} catch (err: any) {
  console.log("Erreur complète:", err.response?.data); // 👈 F12 Console
  const msg = err?.response?.data?.detail ?? JSON.stringify(err?.response?.data) ?? "Erreur.";
  alert(msg);
}
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">
          Chargement des consultations...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-xl">Mes consultations</CardTitle>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="tous">Tous statuts</option>
            {Object.entries(consultationStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveTab("avenir")}
              className={activeTab === "avenir" ? "border-cyan text-cyan bg-cyan/10" : ""}>
              A venir
            </Button>
            <Button variant="outline" onClick={() => setActiveTab("passees")}
              className={activeTab === "passees" ? "border-cyan text-cyan bg-cyan/10" : ""}>
              Passees
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((consultation) => {
              const join = getCountdown(consultation.scheduledAt);
              const initial = consultation.expert?.firstName?.[0] ?? "?";
              const lastName = consultation.expert?.lastName ?? "—";
              const specialization = (consultation.expert?.specialization?.[0] ?? "").replace(/_/g, " ");
              const statusLabel = consultationStatusLabel[consultation.status] ?? consultation.status ?? "—";
              const currentHover = hoverRating[consultation.id] ?? pendingRating[consultation.id] ?? 0;
              const alreadyRated = consultation.rating != null;

              return (
                <Card key={consultation.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan/15 text-cyan font-semibold">
                      {initial}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Me. {lastName}</p>
                      {specialization && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">Specialite: {specialization}</p>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    📅 {consultation.scheduledAt
                      ? new Date(consultation.scheduledAt).toLocaleString("fr-FR", {
                          weekday: "long", day: "2-digit", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—"} ({consultation.duration ?? "?"} min)
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">🔗 Consultation visio</p>
                  <Badge className="mt-2 bg-amber-100 text-amber-700">{statusLabel}</Badge>

                  {activeTab === "avenir" ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => consultation.meetingUrl
                          ? window.open(consultation.meetingUrl, "_blank", "noopener,noreferrer")
                          : alert("Lien de reunion non disponible.")}>
                        Rejoindre
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openModal("reprogrammer", consultation)}>
                        Reprogrammer
                      </Button>
                      <Button size="sm" variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => openModal("annuler", consultation)}>
                        Annuler
                      </Button>
                      {!join.canJoin && join.text && (
                        <span className="text-xs text-slate-500">{join.text}</span>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <details className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
                        <summary className="cursor-pointer font-medium">Compte-rendu de consultation</summary>
                        <p className="mt-2 text-slate-600 dark:text-slate-300">
                          {consultation.report || "Aucun compte-rendu disponible."}
                        </p>
                      </details>

                      {/* ✅ Notation */}
                      {(consultation.status === "terminee" || new Date(consultation.scheduledAt).getTime() < Date.now()) && !alreadyRated && (
                        <div className="rounded-md border border-slate-200 p-3 space-y-2 dark:border-slate-700">
                          <p className="text-xs font-medium text-slate-500">Noter cette consultation :</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} type="button"
                                onMouseEnter={() => setHoverRating((h) => ({ ...h, [consultation.id]: star }))}
                                onMouseLeave={() => setHoverRating((h) => ({ ...h, [consultation.id]: 0 }))}
                                onClick={() => setPendingRating((p) => ({ ...p, [consultation.id]: star }))}
                                className="text-2xl transition-transform hover:scale-110"
                                title={`${star} étoile${star > 1 ? "s" : ""}`}>
                                {star <= currentHover ? "⭐" : "☆"}
                              </button>
                            ))}
                            {pendingRating[consultation.id] && (
                              <span className="ml-1 text-xs text-slate-400">
                                {pendingRating[consultation.id]}/5
                              </span>
                            )}
                          </div>
                          {pendingRating[consultation.id] && (
                            <>
                              <textarea rows={2} placeholder="Commentaire optionnel..."
                                value={ratingComment[consultation.id] ?? ""}
                                onChange={(e) => setRatingComment((r) => ({ ...r, [consultation.id]: e.target.value }))}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              />
                              <Button size="sm" disabled={isRating[consultation.id]}
                                onClick={() => handleSubmitRating(consultation.id)}
                                className="bg-cyan text-white hover:bg-cyan/90">
                                {isRating[consultation.id] ? "Envoi..." : "Envoyer ma note"}
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {/* ✅ Note déjà donnée */}
                      {alreadyRated && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-amber-400">{"⭐".repeat(consultation.rating as number)}</span>
                          <span className="text-xs text-slate-500">Votre note : {consultation.rating}/5</span>
                        </div>
                      )}

                      <Button size="sm" variant="outline" onClick={() => {
                        if (!consultation.report) { alert("Aucun rapport disponible."); return; }
                        const win = window.open("", "_blank");
                        if (!win) return;
                        win.document.write(`<html><head><title>Rapport</title></head><body>
                          <h1>Rapport de consultation — JUSTIA</h1>
                          <p>Date : ${new Date(consultation.scheduledAt).toLocaleString("fr-FR")}</p>
                          <p>Expert : ${consultation.expert?.firstName ?? ""} ${consultation.expert?.lastName ?? ""}</p>
                          <hr/><p>${consultation.report}</p>
                        </body></html>`);
                        win.document.close();
                        win.print();
                      }}>
                        Telecharger le rapport
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}

            {filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">
                Aucune consultation pour ce filtre.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modale */}
      {modal.type && modal.consultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
              {modal.type === "reprogrammer" ? "📅 Demander une reprogrammation" : "❌ Demander une annulation"}
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              {modal.type === "reprogrammer"
                ? "Votre message sera transmis à l'expert."
                : "Votre demande d'annulation sera transmise à l'expert pour validation."}
            </p>
            {modal.type === "reprogrammer" && (
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nouveau créneau souhaité
                </label>
                <input type="datetime-local" value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {modal.type === "reprogrammer" ? "Message à l'expert (optionnel)" : "Motif de l'annulation"}
              </label>
              <textarea rows={3} value={modalMessage}
                onChange={(e) => setModalMessage(e.target.value)}
                placeholder={modal.type === "reprogrammer" ? "Ex: Je préfère le matin..." : "Ex: Je ne suis plus disponible..."}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            {modalError && <p className="mb-3 text-sm text-red-600">{modalError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal} disabled={isSending}>Annuler</Button>
              <Button onClick={handleSendMessage} disabled={isSending}
                className={modal.type === "annuler" ? "bg-red-600 text-white hover:bg-red-700" : "bg-cyan text-white hover:bg-cyan/90"}>
                {isSending ? "Envoi..." : modal.type === "reprogrammer" ? "Envoyer la demande" : "Confirmer l'annulation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}