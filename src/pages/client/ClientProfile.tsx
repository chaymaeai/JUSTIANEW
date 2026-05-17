import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type TabId = "infos" | "securite" | "notifications" | "confidentialite";

interface ProfileFormState {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  entreprise: string;
}

export default function ClientProfile() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("infos");
  const [editingCard, setEditingCard] = useState(false);
  const [toast, setToast] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar ?? "");
  const [profile, setProfile] = useState<ProfileFormState>({
    nom: user?.lastName ?? "",
    prenom: user?.firstName ?? "",
    email: user?.email ?? "",
    telephone: "",
    entreprise: user?.company ?? "",
  });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [notif, setNotif] = useState({
    reponseDemande: true,
    rappelRdv: true,
    smsConfirmation: true,
    nouvelleFacture: true,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const tabs: Array<{ id: TabId; label: string }> = useMemo(
    () => [
      { id: "infos", label: "Informations personnelles" },
      { id: "securite", label: "Securite" },
      { id: "notifications", label: "Notifications" },
      { id: "confidentialite", label: "Confidentialite" },
    ],
    []
  );

  const roleLabel = user?.role === "admin" ? "Admin" : user?.role === "provider" ? "Expert" : "Client";
  const memberSince = "Mars 2026";

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const saveProfile = async () => {
    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profile.prenom,
          lastName: profile.nom,
          email: profile.email,
          phone: profile.telephone,
          company: profile.entreprise,
        }),
      });
      if (!response.ok) throw new Error("profile_failed");
      setEditingCard(false);
      showToast("Informations personnelles mises a jour.");
    } catch {
      showToast("Erreur lors de la mise a jour du profil.");
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword.length < 8) {
      showToast("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("La confirmation du mot de passe ne correspond pas.");
      return;
    }
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    showToast("Mot de passe mis a jour.");
  };

  const saveNotifications = async () => {
    try {
      const response = await fetch("/api/users/me/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notif),
      });
      if (!response.ok) throw new Error("notif_failed");
      showToast("Preferences de notification enregistrees.");
    } catch {
      showToast("Erreur de sauvegarde des notifications.");
    }
  };

  return (
    <div className="space-y-4">
      {toast && <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{toast}</div>}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Mon profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xl font-semibold text-slate-700">
                {avatarPreview ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" /> : `${profile.prenom?.[0] ?? ""}${profile.nom?.[0] ?? ""}`}
              </div>
              <div className="space-y-2">
                <label className="cursor-pointer text-sm font-medium text-cyan hover:underline">
                  Uploader avatar
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setAvatarPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
                <p className="text-xs text-slate-500">JPG/PNG uniquement</p>
              </div>
            </div>

            <div>
              <p className="text-lg font-semibold">
                {profile.prenom} {profile.nom}
              </p>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <p className="text-sm text-slate-500">{profile.telephone || "-"}</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge>{roleLabel}</Badge>
              <span className="text-xs text-slate-500">Membre depuis {memberSince}</span>
            </div>

            <Button variant="outline" onClick={() => setEditingCard((prev) => !prev)}>
  {editingCard ? "Annuler" : "Modifier"}
</Button>

            {editingCard && (
              <div className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
                <Input placeholder="Prenom" value={profile.prenom} onChange={(event) => setProfile((prev) => ({ ...prev, prenom: event.target.value }))} />
                <Input placeholder="Nom" value={profile.nom} onChange={(event) => setProfile((prev) => ({ ...prev, nom: event.target.value }))} />
                <Input placeholder="Email" value={profile.email} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} />
                <Input placeholder="Telephone" value={profile.telephone} onChange={(event) => setProfile((prev) => ({ ...prev, telephone: event.target.value }))} />
                <Button size="sm" variant="outline" onClick={saveProfile}>
  Enregistrer
</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-xl">Parametres</CardTitle>
            <div className="flex flex-wrap gap-2">
              {tabs.map((item) => (
                 <Button
    key={item.id}
    size="sm"
    variant="outline"
    className={tab === item.id ? "border-cyan text-cyan bg-cyan/10" : ""}
    onClick={() => setTab(item.id)}
  >
    {item.label}
  </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {tab === "infos" && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nom</label>
                  <Input value={profile.nom} onChange={(event) => setProfile((prev) => ({ ...prev, nom: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Prenom</label>
                  <Input value={profile.prenom} onChange={(event) => setProfile((prev) => ({ ...prev, prenom: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={profile.email} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Telephone</label>
                  <Input value={profile.telephone} onChange={(event) => setProfile((prev) => ({ ...prev, telephone: event.target.value }))} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">Entreprise</label>
                  <Input value={profile.entreprise} onChange={(event) => setProfile((prev) => ({ ...prev, entreprise: event.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Button variant="outline"onClick={saveProfile}>Sauvegarder</Button>
                </div>
              </div>
            )}

            {tab === "securite" && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="password"
                    placeholder="Ancien mot de passe"
                    value={passwordForm.oldPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="Nouveau mot de passe"
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="Confirmer"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={changePassword}>Changer le mot de passe</Button>

                <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-medium">Authentification a deux facteurs</p>
                    <p className="text-xs text-slate-500">Bientot disponible</p>
                  </div>
                  <Switch checked={false} disabled aria-label="2FA" />
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Sessions actives</p>
                  <div className="space-y-2">
                    <div className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                      Chrome - Windows - Casablanca (active)
                    </div>
                    <div className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                      Mobile Safari - iPhone - Rabat
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div className="space-y-4">
                {[
                  { key: "reponseDemande", label: "Email: nouvelle reponse a ma demande" },
                  { key: "rappelRdv", label: "Email: rappel rendez-vous (24h avant)" },
                  { key: "smsConfirmation", label: "SMS: confirmation rendez-vous" },
                  { key: "nouvelleFacture", label: "Email: nouvelle facture" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <p className="text-sm">{item.label}</p>
                    <Switch
                      checked={notif[item.key as keyof typeof notif]}
                      onCheckedChange={(checked) => setNotif((prev) => ({ ...prev, [item.key]: checked }))}
                      aria-label={item.label}
                    />
                  </div>
                ))}
                <Button variant="outline" onClick={saveNotifications}>Sauvegarder les preferences</Button>
              </div>
            )}

            {tab === "confidentialite" && (
              <div className="space-y-4">
                <Button variant="outline">Telecharger mes donnees</Button>
                <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
                  <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">Zone sensible</p>
                  <p className="mb-3 text-sm text-red-600 dark:text-red-300">La suppression est definitive et retire toutes vos donnees.</p>
                  <Button className={cn("bg-red-600 text-white hover:bg-red-700")} onClick={() => setShowDeleteModal(true)}>
                    Supprimer mon compte
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirmer la suppression</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">Voulez-vous vraiment supprimer votre compte ? Cette action est irreversible.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCard((prev) => !prev)}>
  {editingCard ? "Annuler" : "Modifier"}
</Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => {
                    setShowDeleteModal(false);
                    showToast("Suppression demandee. Un email de confirmation vous sera envoye.");
                  }}
                >
                  Confirmer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
