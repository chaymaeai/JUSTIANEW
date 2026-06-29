import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/services/api";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "Faible", width: "33%", color: "bg-red-500" };
  if (score <= 3) return { label: "Moyen", width: "66%", color: "bg-amber-500" };
  return { label: "Fort", width: "100%", color: "bg-emerald-500" };
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const isResetMode = Boolean(token);

  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [step, setStep] = useState(1);
  const [countdown, setCountdown] = useState(60);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, step]);

  // ✅ Appelle réellement POST /auth/reset-password/request/
  const sendResetLink = async () => {
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Veuillez saisir un email valide.");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password/request/", { email: email.trim() });
      setSentEmail(email);
      setStep(2);
      setCountdown(60);
    } catch (err) {
      // Le backend renvoie volontairement 200 même si l'email n'existe pas
      // (pour ne pas révéler quels emails sont enregistrés), donc une erreur
      // ici signifie un vrai problème (validation, serveur, etc.)
      setError(getApiErrorMessage(err, "Une erreur est survenue. Veuillez réessayer."));
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Appelle réellement POST /auth/reset-password/confirm/
  const updatePassword = async () => {
    setError("");
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    if (confirmPassword !== password) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!token) {
      setError("Lien de réinitialisation invalide. Veuillez refaire une demande.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/reset-password/confirm/", {
        token,
        new_password: password,
        new_password_confirm: confirmPassword,
      });
      navigate("/client-space/login");
    } catch (err) {
      setError(getApiErrorMessage(err, "Lien invalide ou expiré. Veuillez refaire une demande."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      activeTab="login"
      title={isResetMode ? "Definir un nouveau mot de passe" : "Mot de passe oublie"}
      subtitle={isResetMode ? "Choisissez un nouveau mot de passe securise." : "Nous vous envoyons un lien de reinitialisation par email."}
    >
      {!isResetMode && step === 1 && (
        <div className="space-y-4">
          <Input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button variant="gradient" className="w-full" onClick={sendResetLink} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le lien de reinitialisation"}
          </Button>
          <p className="text-center text-sm">
            <Link className="text-cyan hover:underline" to="/client-space/login">
              Retour a la connexion
            </Link>
          </p>
        </div>
      )}

      {!isResetMode && step === 2 && (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan/15 text-cyan animate-bounce">
            <Mail className="h-6 w-6" />
          </div>
          <p className="text-slate-700 dark:text-slate-200">Email envoye a {sentEmail}</p>
          <button
            type="button"
            disabled={countdown > 0}
            onClick={sendResetLink}
            className="text-sm font-medium text-cyan disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Renvoyer dans {countdown}s
          </button>
        </div>
      )}

      {isResetMode && (
        <div className="space-y-4">
          <Input type="password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full ${strength.color}`} style={{ width: strength.width }} />
            </div>
            <p className="text-xs text-slate-500">Niveau: {strength.label}</p>
          </div>
          <Input type="password" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button variant="gradient" className="w-full" onClick={updatePassword} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mettre a jour"}
          </Button>
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Reinitialisation securisee via token
          </div>
        </div>
      )}
    </AuthLayout>
  );
}