import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";

interface ProfileFormState {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  entreprise: string;
  adresse: string;
}

export default function ClientProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState<ProfileFormState>({
    nom: user?.lastName ?? "",
    prenom: user?.firstName ?? "",
    email: user?.email ?? "",
    telephone: "",
    entreprise: user?.company ?? "",
    adresse: "",
  });

  const roleLabel =
    user?.role === "admin" ? "Admin" : user?.role === "provider" ? "Expert" : "Client";
  const memberSince = "Mars 2026";

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarChange = (file: File) => {
    if (!file.type.match(/image\/(jpeg|png)/)) {
      showToast("Seuls les fichiers JPG et PNG sont acceptés.", "error");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleAvatarChange(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/me/", {
        first_name: profile.prenom,
        last_name: profile.nom,
        phone: profile.telephone,
        company: profile.entreprise,
      });

      // ✅ Met à jour le contexte → sidebar se rafraîchit immédiatement
      updateUser({
        firstName: profile.prenom,
        lastName: profile.nom,
        company: profile.entreprise,
      });

      setAvatarFile(null);
      showToast("Profil mis à jour avec succès.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      showToast(`Erreur lors de la sauvegarde : ${message}`, "error");
    } finally {
      setSaving(false);
    }
  };


  const initials = `${profile.prenom?.[0] ?? ""}${profile.nom?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all
            ${toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
            }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Mon profil</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos informations personnelles</p>
        </div>

        {/* Avatar Card */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
            Photo de profil
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar preview */}
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {avatarPreview
                  ? <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  : initials || "?"}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow flex items-center justify-center hover:bg-slate-50 transition-colors"
                title="Modifier la photo"
              >
                <svg className="h-4 w-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 cursor-pointer rounded-lg border-2 border-dashed px-6 py-5 text-center transition-colors
                ${isDragging
                  ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
            >
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium text-cyan-600 dark:text-cyan-400">Cliquez pour uploader</span>{" "}
                ou glissez votre fichier ici
              </p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG — max 5 Mo</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarChange(file);
              }}
            />
          </div>

          {/* User info preview */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {profile.prenom} {profile.nom}
              </p>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary">{roleLabel}</Badge>
              <span className="text-xs text-slate-400">Membre depuis {memberSince}</span>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-5">
            Informations personnelles
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Prénom
              </label>
              <Input
                placeholder="Votre prénom"
                value={profile.prenom}
                onChange={(e) => setProfile((p) => ({ ...p, prenom: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Nom
              </label>
              <Input
                placeholder="Votre nom"
                value={profile.nom}
                onChange={(e) => setProfile((p) => ({ ...p, nom: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Adresse email
              </label>
              <Input
                type="email"
                placeholder="vous@exemple.com"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Téléphone
              </label>
              <Input
                type="tel"
                placeholder="+212 6XX XXX XXX"
                value={profile.telephone}
                onChange={(e) => setProfile((p) => ({ ...p, telephone: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Société
              </label>
              <Input
                placeholder="Nom de votre entreprise"
                value={profile.entreprise}
                onChange={(e) => setProfile((p) => ({ ...p, entreprise: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Adresse
              </label>
              <Input
                placeholder="Rue, ville, code postal, pays"
                value={profile.adresse}
                onChange={(e) => setProfile((p) => ({ ...p, adresse: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="min-w-[140px] bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Sauvegarde...
                </span>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}