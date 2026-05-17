import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, CalendarDays, FileText, FolderOpen, MessageSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/pages/client/DashboardContext";
import type { DemandeStatus } from "@/types/client";

const domainLabels = {
  droit_affaires: "Droit des affaires",
  rgpd: "RGPD",
  droit_ia: "Droit IA",
  propriete_intellectuelle: "Propriete intellectuelle",
  droit_numerique: "Droit numerique",
  immobilier: "Immobilier",
  gouvernance: "Gouvernance",
} as const;

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

export default function ClientDashboard() {
  const { user } = useAuth();
  const { demandes, consultations, documents, dossiers } = useDashboard();

  const sortedDemandes = [...demandes].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const latestDemandes = sortedDemandes.slice(0, 5);
  const nextConsultation = [...consultations]
    .filter((c) => c.status === "planifiee" || c.status === "en_cours")
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))[0];
  const activeDemandesCount = demandes.filter((d) =>
    d.status === "en_attente" || d.status === "en_cours" || d.status === "assignee"
  ).length;
  const activeConsultationsCount = consultations.filter(
    (c) => c.status === "planifiee" || c.status === "en_cours"
  ).length;

  const isSoon = nextConsultation
    ? new Date(nextConsultation.scheduledAt).getTime() - Date.now() <= 30 * 60 * 1000
    : false;

  // ✅ Activité récente — fusion demandes + documents triés par date
  const recentActivity = [
    ...demandes.map((d) => ({
      id: d.id,
      type: "demande" as const,
      label: `Demande ${d.reference}`,
      sublabel: statusLabel[d.status],
      date: new Date(d.updatedAt),
      color: "text-blue-600",
      bg: "bg-blue-50",
      icon: "📋",
    })),
    ...documents.map((d) => ({
      id: d.id,
      type: "document" as const,
      label: d.name,
      sublabel: "Document uploadé",
      date: new Date(d.uploadedAt),
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      icon: "📄",
    })),
    ...consultations.map((c) => ({
      id: c.id,
      type: "consultation" as const,
      label: `Consultation avec ${c.expert?.firstName ?? "—"} ${c.expert?.lastName ?? ""}`,
      sublabel: c.status === "planifiee" ? "En attente" : c.status === "en_cours" ? "En cours" : "Terminée",
      date: new Date(c.scheduledAt),
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: "🗓️",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ── Bannière ── */}
      <Card className="border-0 bg-gradient-to-r from-cyan to-blue-600 text-white shadow-md">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-semibold">Bonjour, {user?.firstName ?? "Client"}</p>
            <p className="mt-1 text-sm text-white/85">Voici un resume de votre activite juridique.</p>
          </div>
          <Button asChild className="bg-white text-blue-700 hover:bg-white/90">
            <Link to="/espace-client/demandes?new=1">
              Nouvelle demande <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* ── Statistiques ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <FileText className="h-5 w-5 text-cyan" />
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-sm text-slate-500">Demandes</p>
            <p className="mt-1 text-xl font-semibold">{activeDemandesCount} actives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <MessageSquare className="h-5 w-5 text-cyan" />
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-sm text-slate-500">Consultations</p>
            <p className="mt-1 text-xl font-semibold">{activeConsultationsCount} en cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <CalendarDays className="h-5 w-5 text-cyan" />
            </div>
            <p className="text-sm text-slate-500">Prochaine RDV</p>
            <p className="mt-1 text-xl font-semibold">
              {nextConsultation
                ? new Date(nextConsultation.scheduledAt).toLocaleString("fr-FR", {
                    weekday: "short", day: "2-digit", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })
                : "Aucun"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <FolderOpen className="h-5 w-5 text-cyan" />
            </div>
            <p className="text-sm text-slate-500">Documents</p>
            <p className="mt-1 text-xl font-semibold">{documents.length} fichiers</p>
          </CardContent>
        </Card>
      </section>

      {/* ── Demandes + RDV ── */}
      <section className="grid gap-4 xl:grid-cols-5">

        {/* Dernières demandes */}
        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Dernieres demandes</CardTitle>
            <Link className="text-sm font-medium text-cyan hover:underline" to="/espace-client/demandes">
              Voir tout
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {/* ✅ Message si vide */}
            {latestDemandes.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                📋 Aucune demande pour le moment.{" "}
                <Link to="/espace-client/demandes?new=1" className="text-cyan hover:underline">
                  Créer une demande →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Domaine</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestDemandes.map((demande) => (
                      <tr key={demande.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-700">{demande.reference}</td>
                        <td className="px-4 py-3">{domainLabels[demande.domain]}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn("border", statusStyles[demande.status])}>
                            {statusLabel[demande.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(demande.updatedAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <Link className="font-medium text-cyan hover:underline" to="/espace-client/demandes">
                            Voir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prochain RDV */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Prochain rendez-vous</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextConsultation ? (
              <>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <CalendarClock className="h-4 w-4 text-cyan" />
                    {new Date(nextConsultation.scheduledAt).toLocaleString("fr-FR", {
                      dateStyle: "full", timeStyle: "short",
                    })}
                  </p>
                  {/* ✅ Nom expert + spécialisation */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">
                      {(nextConsultation.expert?.firstName?.[0] ?? "?")}
                      {(nextConsultation.expert?.lastName?.[0] ?? "")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Me. {nextConsultation.expert?.firstName ?? "—"} {nextConsultation.expert?.lastName ?? ""}
                      </p>
                      {nextConsultation.expert?.specialization?.[0] && (
                        <p className="text-xs text-slate-500">
                          {domainLabels[nextConsultation.expert.specialization[0]] ?? nextConsultation.expert.specialization[0]}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* ✅ Bouton Rejoindre seulement si dans 30 min */}
                  {isSoon && nextConsultation.meetingUrl && (
                    <div className="mt-3">
                      <Button
                        className="bg-cyan text-white hover:bg-cyan/90"
                        onClick={() => window.open(nextConsultation.meetingUrl, "_blank")}
                      >
                        Rejoindre
                      </Button>
                    </div>
                  )}
                </div>
                {/* ✅ Autres consultations */}
                <div className="space-y-2">
                  {consultations.slice(1, 4).map((consultation) => (
                    <div key={consultation.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <span>{new Date(consultation.scheduledAt).toLocaleDateString("fr-FR", {
                        weekday: "short", day: "numeric", month: "short",
                      })}</span>
                      <span className="text-slate-500">{consultation.duration} min</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                📅 Aucun rendez-vous planifie.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Dossiers actifs ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mes dossiers actifs</h2>
          <Link to="/espace-client/demandes" className="text-sm font-medium text-cyan hover:underline">
            Voir tous
          </Link>
        </div>
        {/* ✅ Message si vide */}
        {dossiers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-400">
              📁 Aucun dossier actif pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {dossiers.map((dossier) => (
              <Card key={dossier.id} className="min-w-[280px] flex-shrink-0">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{dossier.reference}</p>
                    <Badge className={cn("border",
                      dossier.statusTone === "amber" && "bg-amber-100 text-amber-700",
                      dossier.statusTone === "blue" && "bg-blue-100 text-blue-700",
                      dossier.statusTone === "green" && "bg-green-100 text-green-700",
                      dossier.statusTone === "red" && "bg-red-100 text-red-700"
                    )}>
                      {dossier.statusLabel}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{dossier.domainLabel}</p>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-cyan transition-all" style={{ width: `${dossier.progress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500">Derniere activite: {dossier.lastActivity}</p>
                  <Link to="/espace-client/demandes" className="inline-flex items-center text-sm font-medium text-cyan hover:underline">
                    Voir le dossier
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ✅ Activité récente */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Activite recente</h2>
        </div>
        <Card>
          <CardContent className="divide-y divide-slate-100 p-0">
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Aucune activite recente.</p>
            ) : (
              recentActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-lg", item.bg)}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.sublabel}</p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-400">
                    {item.date.toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}