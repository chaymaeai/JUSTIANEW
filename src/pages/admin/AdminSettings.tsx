import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Lock, Users, Zap } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    platformName: "JUSTIA",
    registrationEnabled: true,
    emailVerificationRequired: true,
    maxExpertsPerConsultation: 3,
    consultationTimeout: 24,
    notifyNewRegistration: true,
    notifyNewConsultation: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (key: keyof typeof settings) => (e: any) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert("Paramètres sauvegardés");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Paramètres</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configurez les options de la plateforme
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Paramètres généraux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Nom de la plateforme
            </label>
            <Input
              value={settings.platformName}
              onChange={handleChange("platformName")}
              placeholder="JUSTIA"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Autoriser les inscriptions</p>
              <p className="text-sm text-slate-500">Les clients peuvent créer de nouveaux comptes</p>
            </div>
            <input
              type="checkbox"
              checked={settings.registrationEnabled}
              onChange={handleChange("registrationEnabled")}
              className="h-5 w-5 rounded accent-cyan"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Vérification email obligatoire</p>
              <p className="text-sm text-slate-500">Les clients doivent confirmer leur email</p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailVerificationRequired}
              onChange={handleChange("emailVerificationRequired")}
              className="h-5 w-5 rounded accent-cyan"
            />
          </div>
        </CardContent>
      </Card>

      {/* Consultation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Paramètres des consultations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Experts maximum par consultation
            </label>
            <Input
              type="number"
              min="1"
              max="10"
              value={settings.maxExpertsPerConsultation}
              onChange={handleChange("maxExpertsPerConsultation")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Durée consultation (heures)
            </label>
            <Input
              type="number"
              min="1"
              value={settings.consultationTimeout}
              onChange={handleChange("consultationTimeout")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Notifier les nouvelles inscriptions</p>
              <p className="text-sm text-slate-500">Recevoir une alerte quand un client s'inscrit</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyNewRegistration}
              onChange={handleChange("notifyNewRegistration")}
              className="h-5 w-5 rounded accent-cyan"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Notifier les nouvelles consultations</p>
              <p className="text-sm text-slate-500">Recevoir une alerte quand une consultation est créée</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyNewConsultation}
              onChange={handleChange("notifyNewConsultation")}
              className="h-5 w-5 rounded accent-cyan"
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Politique de mot de passe
            </label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-600 dark:text-white">
              <option>Standard (8+ caractères)</option>
              <option>Renforcée (12+ caractères, majuscules, chiffres, symboles)</option>
              <option>Très renforcée (16+ caractères)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Réinitialiser tous les cached
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 dark:text-red-400">
                Archiver les données anciennes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-cyan text-white hover:bg-cyan/90"
        >
          {isSaving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </Button>
        <Button variant="outline">
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
