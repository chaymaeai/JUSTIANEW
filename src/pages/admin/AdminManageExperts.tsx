import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Trash2, Edit2, Plus, Eye, EyeOff, Check, X, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/services/api";

interface Expert {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  speciality: string;
  is_active: boolean;
  created_at: string;
}

interface CreateExpertForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  speciality: string;
}

interface EditExpertForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  speciality: string;
}

const EMPTY_FORM: CreateExpertForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  phone: "",
  speciality: "",
};

export default function AdminManageExperts() {
  const [experts, setExperts]           = useState<Expert[]>([]);
  const [totalExpertsCount, setTotalExpertsCount] = useState(0);
  const [isLoading, setIsLoading]       = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Edition inline ──────────────────────────────────────────
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editForm, setEditForm]       = useState<EditExpertForm>({
    first_name: "", last_name: "",email: "" ,phone: "", speciality: "",
  });
  const [isSaving, setIsSaving]       = useState(false);

  // ── Création ────────────────────────────────────────────────
  const [form, setForm]               = useState<CreateExpertForm>(EMPTY_FORM);
  const [formErrors, setFormErrors]   = useState<Record<string, string>>({});

  useEffect(() => { loadExperts(); }, []);

  // ── Helpers ─────────────────────────────────────────────────
  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
    else          { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
  };

  // ── Chargement ──────────────────────────────────────────────
  const loadExperts = async () => {
  try {
    setIsLoading(true);
    const response = await api.get("/experts/admin/list/"); // ✅ URL correcte
    console.log("API Response:", response.data); // DEBUG
    // Gérer les réponses paginées (avec .results et .count) ou directes (tableau)
    if (Array.isArray(response.data)) {
      console.log("Array response, length:", response.data.length);
      setExperts(response.data);
      setTotalExpertsCount(response.data.length);
    } else if (response.data?.results) {
      // Réponse paginée
      console.log("Paginated response, count:", response.data.count, "results length:", response.data.results.length);
      setExperts(response.data.results);
      setTotalExpertsCount(response.data.count || response.data.results.length);
    } else {
      console.log("Direct response:", response.data);
      setExperts(response.data || []);
      setTotalExpertsCount((response.data || []).length);
    }
    setError(null);
  } catch (err) {
    console.error("Error loading experts:", err);
    flash(getApiErrorMessage(err, "Erreur lors du chargement des experts"), true);
  } finally {
    setIsLoading(false);
  }
};
  // ── Validation ──────────────────────────────────────────────
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.first_name.trim())              errors.first_name = "Le prénom est requis";
    if (!form.last_name.trim())               errors.last_name  = "Le nom est requis";
    if (!form.email.trim())                   errors.email      = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                              errors.email      = "Email invalide";
    if (!form.password || form.password.length < 8)
                                              errors.password   = "Minimum 8 caractères";
    if (!form.phone.trim())                   errors.phone      = "Le téléphone est requis";
    if (!form.speciality.trim())              errors.speciality = "La spécialité est requise";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (key: keyof CreateExpertForm) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
      if (formErrors[key]) setFormErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

  // ── Créer expert ────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!validateForm()) return;
  setIsSubmitting(true);
  try {
    const payload = {
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      email:      form.email.trim().toLowerCase(),
      password:   form.password,
      phone:      form.phone.trim(),
      speciality: form.speciality.trim(),
    };
    await api.post("/experts/admin/create/", payload);  // ✅
    // ✅ Après
    await loadExperts();   // recharge la vraie liste depuis l'API
setForm(EMPTY_FORM);
setShowForm(false);
flash("Expert créé avec succès ✓");   
  } catch (err) {
    flash(getApiErrorMessage(err, "Erreur lors de la création"), true);
  } finally {
    setIsSubmitting(false);
  }
};

  // ── Supprimer ────────────────────────────────────────────────
  const handleDelete = async (expertId: string, name: string) => {
  if (!confirm(`Supprimer l'expert "${name}" ? Cette action est irréversible.`)) return;
  try {
    await api.delete(`/experts/${expertId}/`);  // ✅
    setExperts(prev => prev.filter(e => e.id !== expertId));
    flash("Expert supprimé ✓");
  } catch (err) {
    flash(getApiErrorMessage(err, "Erreur lors de la suppression"), true);
  }
};

  // ── Activer / Désactiver ─────────────────────────────────────
  const handleToggleActive = async (expert: Expert) => {
  try {
    await api.patch(`/experts/${expert.id}/`, { is_active: !expert.is_active });  // ✅
    setExperts(prev =>
      prev.map(e => e.id === expert.id ? { ...e, is_active: !expert.is_active } : e)
    );
    flash(expert.is_active ? "Expert désactivé" : "Expert activé ✓");
  } catch (err) {
    flash(getApiErrorMessage(err, "Erreur lors de la mise à jour"), true);
  }
};

  // ── Démarrer édition ─────────────────────────────────────────
  const startEdit = (expert: Expert) => {
    setEditingId(expert.id);
    setEditForm({
      first_name: expert.first_name,
      last_name:  expert.last_name,
      phone:      expert.phone,
      email:      expert.email, 
      speciality: expert.speciality,
    });
  };

  const cancelEdit = () => { setEditingId(null); };

  // ── Sauvegarder édition ──────────────────────────────────────
  const handleSaveEdit = async (expertId: string) => {
  if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
    flash("Le prénom et le nom sont requis", true);
    return;
  }
  setIsSaving(true);
  try {
    const response = await api.patch(`/experts/${expertId}/`, editForm);  // ✅
    const updated = response.data;
    setExperts(prev => prev.map(e => e.id === expertId ? { ...e, ...updated } : e));
    setEditingId(null);
    flash("Expert modifié avec succès ✓");
  } catch (err) {
    flash(getApiErrorMessage(err, "Erreur lors de la modification"), true);
  } finally {
    setIsSaving(false);
  }
};

  // ════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* Notifications */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)}><X className="h-4 w-4 text-red-600" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/30 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Experts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {totalExpertsCount} expert{totalExpertsCount !== 1 ? "s" : ""} inscrit{totalExpertsCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => { setShowForm(!showForm); setEditingId(null); }}
          className="bg-cyan text-white hover:bg-cyan/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un expert
        </Button>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un nouvel expert</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Prénom</label>
                  <Input placeholder="Prénom" value={form.first_name} onChange={handleChange("first_name")}
                    className={formErrors.first_name ? "border-red-500" : ""} />
                  {formErrors.first_name && <p className="text-xs text-red-500 mt-1">{formErrors.first_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Nom</label>
                  <Input placeholder="Nom" value={form.last_name} onChange={handleChange("last_name")}
                    className={formErrors.last_name ? "border-red-500" : ""} />
                  {formErrors.last_name && <p className="text-xs text-red-500 mt-1">{formErrors.last_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Email</label>
                  <Input type="email" placeholder="expert@justia.com" value={form.email} onChange={handleChange("email")}
                    className={formErrors.email ? "border-red-500" : ""} />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Téléphone</label>
                  <Input placeholder="+212 6 12 34 56 78" value={form.phone} onChange={handleChange("phone")}
                    className={formErrors.phone ? "border-red-500" : ""} />
                  {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Spécialité</label>
                  <Input placeholder="ex: Droit des affaires, RGPD" value={form.speciality} onChange={handleChange("speciality")}
                    className={formErrors.speciality ? "border-red-500" : ""} />
                  {formErrors.speciality && <p className="text-xs text-red-500 mt-1">{formErrors.speciality}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Mot de passe temporaire</label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="Minimum 8 caractères"
                      value={form.password} onChange={handleChange("password")}
                      className={formErrors.password ? "border-red-500 pr-10" : "pr-10"} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 text-slate-500">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="bg-cyan text-white hover:bg-cyan/90">
                  {isSubmitting ? "Création..." : "Créer l'expert"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des experts */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des experts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Chargement des experts...</p>
            </div>
          ) : experts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Aucun expert pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Téléphone</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Spécialité</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Statut</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {experts.map((expert) => {
                    const isEditing = editingId === expert.id;
                    return (
                      <tr key={expert.id}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">

                        {/* Nom */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Input value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))}
                                className="h-8 text-sm w-24" placeholder="Prénom" />
                              <Input value={editForm.last_name} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))}
                                className="h-8 text-sm w-24" placeholder="Nom" />
                            </div>
                          ) : (
                            <span className="font-medium text-slate-900 dark:text-white">
                              {expert.first_name} {expert.last_name}
                            </span>
                          )}
                        </td>

                        {/* Email (non modifiable) */}
                        {/* Email */}
                      <td className="py-3 px-4">
  {isEditing ? (
    <Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
      className="h-8 text-sm w-48" placeholder="Email" type="email" />  // ✅
  ) : (
    <span className="text-sm text-slate-600 dark:text-slate-300">{expert.email}</span>
  )}
</td>

                        {/* Téléphone */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                              className="h-8 text-sm w-36" placeholder="Téléphone" />
                          ) : (
                            <span className="text-sm text-slate-600 dark:text-slate-300">{expert.phone}</span>
                          )}
                        </td>

                        {/* Spécialité */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input value={editForm.speciality} onChange={e => setEditForm(p => ({ ...p, speciality: e.target.value }))}
                              className="h-8 text-sm w-40" placeholder="Spécialité" />
                          ) : (
                            <span className="text-sm text-slate-600 dark:text-slate-300">{expert.speciality}</span>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            expert.is_active
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {expert.is_active ? "Actif" : "Inactif"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                {/* Sauvegarder */}
                                <button
                                  onClick={() => handleSaveEdit(expert.id)}
                                  disabled={isSaving}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                  title="Sauvegarder"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                {/* Annuler édition */}
                                <button
                                  onClick={cancelEdit}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded dark:text-slate-300 dark:hover:bg-slate-800"
                                  title="Annuler"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Activer / Désactiver */}
                                <button
                                  onClick={() => handleToggleActive(expert)}
                                  className={`p-1.5 rounded ${
                                    expert.is_active
                                      ? "text-emerald-600 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                                  title={expert.is_active ? "Désactiver" : "Activer"}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                {/* Modifier */}
                                <button
                                  onClick={() => startEdit(expert)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded dark:text-slate-300 dark:hover:bg-slate-800"
                                  title="Modifier"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                {/* Supprimer */}
                                <button
                                  onClick={() => handleDelete(expert.id, `${expert.first_name} ${expert.last_name}`)}
                                  className="p-1.5 text-red-600 hover:bg-red-100 rounded dark:text-red-400 dark:hover:bg-red-900/30"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}