import { useEffect, useState } from "react";
import { Eye, EyeOff, Linkedin, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type FormErrors = {
  email?: string;
  password?: string;
};

type Espace = "client" | "expert" | "admin";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [espace, setEspace] = useState<Espace>("client");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const mode = searchParams.get("espace") ?? searchParams.get("mode");
    if (mode === "admin") {
      setEspace("admin");
    } else if (mode === "expert" || mode === "provider" || mode === "fournisseur") {
      setEspace("expert");
    }
  }, [searchParams]);

  const setEspaceTab = (next: Espace) => {
    setEspace(next);
    const nextParams = new URLSearchParams(searchParams);
    if (next === "expert") {
      nextParams.set("espace", "expert");
    } else if (next === "admin") {
      nextParams.set("espace", "admin");
    } else {
      nextParams.delete("espace");
      nextParams.delete("mode");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) {
      nextErrors.email = "L'email est requis.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Format d'email invalide.";
    }

    if (!password) {
      nextErrors.password = "Le mot de passe est requis.";
    } else if (password.length < 8) {
      nextErrors.password = "Le mot de passe doit contenir au moins 8 caracteres.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const role =
        espace === "expert" ? "provider" : espace === "admin" ? "admin" : "client";
      await login(email, password, { role });
      if (rememberMe) {
        localStorage.setItem("justia_remember_me", "true");
      } else {
        localStorage.removeItem("justia_remember_me");
      }

      const from = location.state?.from as { pathname?: string } | undefined;
      const defaultDest =
        role === "admin" ? "/admin/dashboard" :
        role === "provider" ? "/fournisseur/dashboard" : 
        "/espace-client/dashboard";
      const fromPath = from?.pathname ?? "";
      const fromAllowed =
        (role === "admin" && fromPath.startsWith("/admin")) ||
        ((role === "provider") && fromPath.startsWith("/fournisseur")) ||
        (role === "client" && fromPath.startsWith("/espace-client"));
      navigate(fromAllowed && fromPath ? fromPath : defaultDest, { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Identifiants incorrects. Veuillez reessayer.";
      setErrors({ password: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      activeTab="login"
      title={
        espace === "expert"
          ? "Espace equipe JUSTIA"
          : espace === "admin"
            ? "Administration JUSTIA"
            : "Bon retour sur JUSTIA"
      }
      subtitle={
        espace === "expert"
          ? "Connectez-vous pour traiter les demandes clients, suivre les dossiers et repondre depuis le tableau de bord expert."
          : espace === "admin"
            ? "Acces reserve : gestion de l'equipe, affectation des experts et parametres avances."
            : "Connectez-vous pour accéder à votre compte sécurisé."
      }
    >
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/70 sm:gap-2">
        <button
          type="button"
          onClick={() => setEspaceTab("client")}
          className={cn(
            "rounded-lg px-2 py-2 text-center text-xs font-medium transition sm:px-3 sm:text-sm",
            espace === "client" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-300"
          )}
        >
          Client
        </button>
        <button
          type="button"
          onClick={() => setEspaceTab("expert")}
          className={cn(
            "rounded-lg px-2 py-2 text-center text-xs font-medium transition sm:px-3 sm:text-sm",
            espace === "expert" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-300"
          )}
        >
          Expert
        </button>
        <button
          type="button"
          onClick={() => setEspaceTab("admin")}
          className={cn(
            "rounded-lg px-2 py-2 text-center text-xs font-medium transition sm:px-3 sm:text-sm",
            espace === "admin" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-300"
          )}
        >
          Admin
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <Input
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11"
          />
          {errors.email && <p className="mt-1 text-sm text-red-500 animate-[shake_0.3s_ease-in-out]">{errors.email}</p>}
        </div>

        <div>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 px-3 text-slate-500"
              aria-label="Afficher ou masquer le mot de passe"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-red-500 animate-[shake_0.3s_ease-in-out]">{errors.password}</p>}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
            />
            Se souvenir de moi
          </label>
          <Link to="/client-space/forgot-password" className="font-medium text-cyan hover:underline">
            Mot de passe oublie ?
          </Link>
        </div>

        <Button type="submit" variant="gradient" className="h-11 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
        </Button>
      </form>

      <div className="space-y-4">
        <div className="relative text-center text-sm text-slate-500">
          <span className="bg-white px-3 dark:bg-[#0A1628]">ou continuer avec</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span className="text-base">G</span>
            Google
          </button>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-slate-600 dark:text-slate-300">
        {espace === "expert" || espace === "admin" ? (
          <>
            Compte client ?{" "}
            <button type="button" className="font-semibold text-cyan hover:underline" onClick={() => setEspaceTab("client")}>
              Connexion client
            </button>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <Link to="/client-space/register" className="font-semibold text-cyan hover:underline">
              S'inscrire
            </Link>
          </>
        )}
      </p>
    </AuthLayout>
  );
}
