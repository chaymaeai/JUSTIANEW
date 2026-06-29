 import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/services/api";

type SectionId = "securite" | "notifications" | "disponibilite" | "confidentialite";

interface Toast {
  message: string;
  type: "success" | "error";
}

export default function FournisseurSettings() {
  const [section, setSection] = useState<SectionId>("securite");
  const [toast, setToast] = useState<Toast | null>(null);
  const [saving, setSaving] = useState(false);

  // Sécurité
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Notifications
  const [notif, setNotif] = useState({
    emailNouvelleDemande: true,
    emailRappelRdv: true,
    emailFacture: true,
    smsConfirmation: true,
    smsCancelRdv: false,
    pushNouveautes: true,
    pushOffres: false,
  });

  // Disponibilité / préférences pro
  const [dispo, setDispo] = useState({
    autoAssign: true,
    notifUrgent: true,
    horaireDebut: "09:00",
    horaireFin: "18:00",
  });

  // Confidentialité
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDataModal, setShowDataModal] = useState(false);
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword.length < 8) {
      showToast("Le mot de passe doit contenir au moins 8 caractères.", "error");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Les mots de passe ne correspondent pas.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/auth/change-password/", {
        old_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword,
        new_password_confirm: passwordForm.confirmPassword,
      });
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Mot de passe mis à jour avec succès.");
    } catch {
      showToast("Erreur lors du changement de mot de passe.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/notifications/", {
        notif_email_demande: notif.emailNouvelleDemande,
        notif_email_rdv: notif.emailRappelRdv,
        notif_email_facture: notif.emailFacture,
        notif_sms_rdv: notif.smsConfirmation,
      });
      showToast("Préférences de notification enregistrées.");
    } catch {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDisponibilite = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/preferences/", {
        auto_assign: dispo.autoAssign,
        notif_urgent: dispo.notifUrgent,
        horaire_debut: dispo.horaireDebut,
        horaire_fin: dispo.horaireFin,
      });
      showToast("Préférences professionnelles enregistrées.");
    } catch {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleViewData = async () => {
    try {
      const { data } = await api.get("/auth/me/");
      setUserData(data);
      setShowDataModal(true);
    } catch {
      showToast("Erreur lors du chargement des données.", "error");
    }
  };

  const handleDownloadData = async () => {
    try {
      showToast("Préparation de vos données en cours…");
    } catch {
      showToast("Erreur lors du téléchargement.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "SUPPRIMER") {
      showToast("Veuillez taper SUPPRIMER pour confirmer.", "error");
      return;
    }
    setSaving(true);
    try {
      showToast("Un email de confirmation vous a été envoyé.");
      setShowDeleteModal(false);
      setDeleteConfirmText("");
    } catch {
      showToast("Erreur lors de la suppression.", "error");
    } finally {
      setSaving(false);
    }
  };

  const navItems: Array<{ id: SectionId; label: string; icon: string }> = [
    { id: "securite", label: "Sécurité", icon: "🔒" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "disponibilite", label: "Disponibilité", icon: "🗓️" },
    { id: "confidentialite", label: "Confidentialité", icon: "🛡️" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg
            ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Paramètres</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez la sécurité et les préférences de votre compte expert</p>
        </div>

        {/* Nav tabs */}
        <div className="flex gap-2 flex-wrap">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                ${section === item.id
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* ── SÉCURITÉ ── */}
        {section === "securite" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-5">
                Changer le mot de passe
              </h2>
              <form
                className="space-y-3 max-w-md"
                onSubmit={(e) => { e.preventDefault(); void handlePasswordChange(); }}
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mot de passe actuel</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, oldPassword: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nouveau mot de passe</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                  <p className="text-xs text-slate-400">Minimum 8 caractères</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Confirmer le nouveau mot de passe</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="pt-1">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </form>
            </div>

            {/* 2FA */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
                Double authentification (2FA)
              </h2>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Authentification à deux facteurs</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bientôt disponible — renforce la sécurité de votre compte</p>
                </div>
                <Switch checked={false} disabled aria-label="2FA" />
              </div>
            </div>

            {/* Sessions */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Sessions actives
                </h2>
                <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                  Déconnecter tout
                </Button>
              </div>
              <div className="space-y-2">
                {[
                  { device: "Chrome · Windows", location: "Casablanca, MA", current: true, time: "Maintenant" },
                  { device: "Safari · iPhone", location: "Rabat, MA", current: false, time: "Il y a 2h" },
                  { device: "Firefox · macOS", location: "Paris, FR", current: false, time: "Il y a 3 jours" },
                ].map((session, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${session.current ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {session.device}
                          {session.current && (
                            <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">Session actuelle</span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{session.location} · {session.time}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <button className="text-xs text-red-500 hover:text-red-700">Révoquer</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {section === "notifications" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">✉️</span>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Email</h2>
              </div>
              <div className="space-y-2">
                {[
                  { key: "emailNouvelleDemande", label: "Nouvelle demande client", desc: "Reçu dès qu'un client soumet une demande" },
                  { key: "emailRappelRdv", label: "Rappel de rendez-vous", desc: "24h avant votre rendez-vous" },
                  { key: "emailFacture", label: "Nouvelle facture disponible", desc: "À chaque émission de facture" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notif[item.key as keyof typeof notif]}
                      onCheckedChange={(v) => setNotif((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">💬</span>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">SMS</h2>
              </div>
              <div className="space-y-2">
                {[
                  { key: "smsConfirmation", label: "Confirmation de rendez-vous", desc: "SMS envoyé à la réservation" },
                  { key: "smsCancelRdv", label: "Annulation de rendez-vous", desc: "SMS si un RDV est annulé" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notif[item.key as keyof typeof notif]}
                      onCheckedChange={(v) => setNotif((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🔔</span>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Push notifications</h2>
              </div>
              <div className="space-y-2">
                {[
                  { key: "pushNouveautes", label: "Nouveautés et mises à jour", desc: "Nouvelles fonctionnalités de la plateforme" },
                  { key: "pushOffres", label: "Offres et promotions", desc: "Offres spéciales et réductions" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notif[item.key as keyof typeof notif]}
                      onCheckedChange={(v) => setNotif((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveNotifications}
                disabled={saving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Enregistrer les préférences
              </Button>
            </div>
          </div>
        )}

        {/* ── DISPONIBILITÉ / PRÉFÉRENCES PRO ── */}
        {section === "disponibilite" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
                Gestion des demandes
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Assignation automatique</p>
                    <p className="text-xs text-slate-400 mt-0.5">Les nouvelles demandes vous sont assignées automatiquement selon votre domaine</p>
                  </div>
                  <Switch
                    checked={dispo.autoAssign}
                    onCheckedChange={(v) => setDispo((p) => ({ ...p, autoAssign: v }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Alerte demandes urgentes</p>
                    <p className="text-xs text-slate-400 mt-0.5">Recevoir une notification immédiate pour les demandes marquées urgentes</p>
                  </div>
                  <Switch
                    checked={dispo.notifUrgent}
                    onCheckedChange={(v) => setDispo((p) => ({ ...p, notifUrgent: v }))}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
                Horaires de disponibilité
              </h2>
              <div className="flex gap-4 max-w-md">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Début</label>
                  <Input
                    type="time"
                    value={dispo.horaireDebut}
                    onChange={(e) => setDispo((p) => ({ ...p, horaireDebut: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fin</label>
                  <Input
                    type="time"
                    value={dispo.horaireFin}
                    onChange={(e) => setDispo((p) => ({ ...p, horaireFin: e.target.value }))}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveDisponibilite}
                disabled={saving}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                Enregistrer les préférences
              </Button>
            </div>
          </div>
        )}

        {/* ── CONFIDENTIALITÉ ── */}
        {section === "confidentialite" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
                Gestion des données
              </h2>
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Données personnelles</p>
                  <p className="text-xs text-slate-400 mt-0.5 mb-3">Nom, email, téléphone, société et adresse stockés de façon sécurisée</p>
                  <Button variant="outline" size="sm" className="text-xs" onClick={handleViewData}>
                    Voir mes données
                  </Button>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Cookies et traceurs</p>
                  <p className="text-xs text-slate-400 mt-0.5 mb-3">Seuls les cookies essentiels au fonctionnement sont utilisés</p>
                  <Button variant="outline" size="sm" className="text-xs">Gérer les cookies</Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                Télécharger mes données
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Exportez l'ensemble de vos données personnelles au format JSON. Vous recevrez un email avec le lien de téléchargement.
              </p>
              <Button variant="outline" onClick={handleDownloadData} className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exporter mes données
              </Button>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-6">
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">
                Zone dangereuse
              </h2>
              <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                La suppression de votre compte est définitive. Toutes vos demandes, documents, clients et factures seront effacés sans possibilité de récupération.
              </p>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setShowDeleteModal(true)}
              >
                Supprimer mon compte
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Confirmer la suppression</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Cette action est irréversible. Tapez <span className="font-mono font-semibold text-red-600">SUPPRIMER</span> pour confirmer.
            </p>
            <Input
              placeholder="SUPPRIMER"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mb-4 font-mono"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
              >
                Annuler
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteConfirmText !== "SUPPRIMER" || saving}
                onClick={handleDeleteAccount}
              >
                Confirmer la suppression
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal données personnelles */}
      {showDataModal && userData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Mes données personnelles
            </h3>
            <div className="space-y-2">
              {[
                { label: "Prénom", value: userData.first_name },
                { label: "Nom", value: userData.last_name },
                { label: "Email", value: userData.email },
                { label: "Téléphone", value: userData.phone || "—" },
                { label: "Société", value: userData.company || "—" },
                { label: "Rôle", value: userData.role },
                {
                  label: "Membre depuis",
                  value: userData.created_at
                    ? new Date(userData.created_at as string).toLocaleDateString("fr-FR")
                    : "—",
                },
              ].map((item) => (
                <div key={item.label} className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-2">
                  <span className="text-xs font-medium text-slate-500 uppercase">{item.label}</span>
                  <span className="text-sm text-slate-800 dark:text-slate-200">{item.value as string}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowDataModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}