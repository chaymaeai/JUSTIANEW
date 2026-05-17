import { useMemo, useReducer, useState } from "react";
import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import type { RegisterData } from "@/types/auth";
import axios from "axios";

const LEGAL_DOMAINS = ["Droit des affaires", "RGPD", "Droit de l'IA", "PI", "Immobilier", "Autre"];
const SECTORS = ["Technologie", "Finance", "Industrie", "Sante", "Immobilier", "Autre"];
const TAKEN_EMAILS = new Set(["taken@justia.com", "existing@justia.com"]);

interface RegisterState {
  step: 1 | 2 | 3;
  data: RegisterData;
  confirmPassword: string;
}

type RegisterAction =
  | { type: "SET_STEP"; payload: RegisterState["step"] }
  | { type: "UPDATE"; payload: Partial<RegisterData> }
  | { type: "SET_CONFIRM_PASSWORD"; payload: string };

const initialState: RegisterState = {
  step: 1,
  data: {
    title: "M.",
    firstName: "",
    lastName: "",
    email: "",
    phonePrefix: "+212",
    phone: "",
    accountType: "particulier",
    companyName: "",
    companyId: "",
    sector: "",
    legalDomains: [],
    password: "",
    acceptsTerms: false,
    acceptsDataProcessing: false,
    acceptsNewsletter: false,
  },
  confirmPassword: "",
};

function reducer(state: RegisterState, action: RegisterAction): RegisterState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "UPDATE":
      return { ...state, data: { ...state.data, ...action.payload } };
    case "SET_CONFIRM_PASSWORD":
      return { ...state, confirmPassword: action.payload };
    default:
      return state;
  }
}

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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = useMemo(() => getPasswordStrength(state.data.password), [state.data.password]);
  const needsCompanyDetails = state.data.accountType === "entreprise" || state.data.accountType === "cabinet";

  const validateStep = async () => {
    const nextErrors: Record<string, string> = {};

    if (state.step === 1) {
      if (!state.data.firstName.trim()) nextErrors.firstName = "Le prenom est requis.";
      if (!state.data.lastName.trim()) nextErrors.lastName = "Le nom est requis.";
      if (!state.data.email.trim()) {
        nextErrors.email = "L'email est requis.";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.data.email)) {
        nextErrors.email = "Format d'email invalide.";
      } else if (TAKEN_EMAILS.has(state.data.email.toLowerCase())) {
        nextErrors.email = "Cet email est deja utilise.";
      }
      if (!state.data.phone.trim()) nextErrors.phone = "Le telephone est requis.";
    }

    if (state.step === 2) {
      if (state.data.legalDomains.length === 0) nextErrors.legalDomains = "Choisissez au moins un domaine.";
      if (needsCompanyDetails) {
        if (!state.data.companyName?.trim()) nextErrors.companyName = "La raison sociale est requise.";
        if (!state.data.companyId?.trim()) nextErrors.companyId = "Le numero SIRET / ICE est requis.";
        if (!state.data.sector?.trim()) nextErrors.sector = "Selectionnez un secteur.";
      }
    }

    if (state.step === 3) {
      if (state.data.password.length < 8) nextErrors.password = "Minimum 8 caracteres.";
      if (state.confirmPassword !== state.data.password) {
        nextErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
      }
      if (!state.data.acceptsTerms) nextErrors.acceptsTerms = "Vous devez accepter les CGU.";
      if (!state.data.acceptsDataProcessing) {
        nextErrors.acceptsDataProcessing = "Le consentement RGPD est requis.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = async () => {
    const valid = await validateStep();
    if (!valid) return;
    dispatch({ type: "SET_STEP", payload: (state.step + 1) as RegisterState["step"] });
  };

  const goPrev = () => {
    dispatch({ type: "SET_STEP", payload: (state.step - 1) as RegisterState["step"] });
  };

  const submit = async () => {
    const valid = await validateStep();
    if (!valid) return;

    // ✅ Protection contre double submit
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await register(state.data);
      setIsSuccess(true);
    } catch (err: unknown) {
      const nextErrors: Record<string, string> = {};

      // Gestion des erreurs axios standard
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        
        // Format custom du backend avec "message"
        if (data?.message) {
          nextErrors.general = data.message;
        } else if (data?.email) {
          nextErrors.email = Array.isArray(data.email) ? data.email[0] : data.email;
        } else if (data?.password) {
          nextErrors.password = Array.isArray(data.password) ? data.password[0] : data.password;
        } else if (data?.first_name) {
          nextErrors.firstName = Array.isArray(data.first_name) ? data.first_name[0] : data.first_name;
        } else if (data?.last_name) {
          nextErrors.lastName = Array.isArray(data.last_name) ? data.last_name[0] : data.last_name;
        } else if (data?.non_field_errors) {
          nextErrors.general = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        } else {
          nextErrors.general = "Une erreur est survenue. Veuillez réessayer.";
        }
      } else if (err instanceof Error) {
        // Si c'est une Error "lancée" par le service, utilise le message
        nextErrors.general = err.message;
      } else {
        nextErrors.general = "Une erreur est survenue. Veuillez réessayer.";
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        // ✅ Revenir à l'étape 1 si c'est une erreur de formulaire
        if (nextErrors.email || nextErrors.firstName || nextErrors.lastName) {
          dispatch({ type: "SET_STEP", payload: 1 });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isSuccess) {
    return (
      <AuthLayout activeTab="register" title="Compte cree !" subtitle="Verifiez votre email pour activer votre compte.">
        <div className="space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/40 dark:bg-emerald-950/30">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white animate-pulse">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-slate-700 dark:text-slate-200">Compte cree ! Verifiez votre email.</p>
          <Button variant="gradient" className="w-full" onClick={() => navigate("/client-space/login")}>
            Aller a la connexion
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      activeTab="register"
      title="Creer votre compte"
      subtitle="Inscription rapide en 3 étapes pour accéder à votre compte."
    >
      <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
        <span className={state.step >= 1 ? "text-cyan" : ""}>Step 1</span>
        <span className="h-px w-10 bg-slate-300" />
        <span className={state.step >= 2 ? "text-cyan" : ""}>Step 2</span>
        <span className="h-px w-10 bg-slate-300" />
        <span className={state.step >= 3 ? "text-cyan" : ""}>Step 3</span>
      </div>

      {state.step === 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Votre identite</h2>
          <div className="flex gap-2">
            {(["M.", "Mme", "Autre"] as const).map((title) => (
              <button
                key={title}
                type="button"
                onClick={() => dispatch({ type: "UPDATE", payload: { title } })}
                className={`rounded-full border px-4 py-2 text-sm ${
                  state.data.title === title ? "border-cyan bg-cyan/10 text-cyan" : "border-slate-300 text-slate-600"
                }`}
              >
                {title}
              </button>
            ))}
          </div>
          <Input placeholder="Prenom" value={state.data.firstName} onChange={(e) => dispatch({ type: "UPDATE", payload: { firstName: e.target.value } })} />
          {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
          <Input placeholder="Nom" value={state.data.lastName} onChange={(e) => dispatch({ type: "UPDATE", payload: { lastName: e.target.value } })} />
          {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
          <Input type="email" placeholder="Email" value={state.data.email} onChange={(e) => dispatch({ type: "UPDATE", payload: { email: e.target.value } })} />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          <div className="flex gap-2">
            <select
              value={state.data.phonePrefix}
              onChange={(e) => dispatch({ type: "UPDATE", payload: { phonePrefix: e.target.value as "+212" | "+33" } })}
              className="h-10 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="+212">+212</option>
              <option value="+33">+33</option>
            </select>
            <Input placeholder="Telephone" value={state.data.phone} onChange={(e) => dispatch({ type: "UPDATE", payload: { phone: e.target.value } })} />
          </div>
          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
        </section>
      )}

      {state.step === 2 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Votre profil</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE", payload: { accountType: "particulier" } })}
              className={`rounded-xl border p-3 text-left text-sm ${state.data.accountType === "particulier" ? "border-cyan bg-cyan/10" : "border-slate-300"}`}
            >
              👤 Particulier
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE", payload: { accountType: "entreprise" } })}
              className={`rounded-xl border p-3 text-left text-sm ${state.data.accountType === "entreprise" ? "border-cyan bg-cyan/10" : "border-slate-300"}`}
            >
              🏢 Entreprise
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "UPDATE", payload: { accountType: "cabinet" } })}
              className={`rounded-xl border p-3 text-left text-sm ${state.data.accountType === "cabinet" ? "border-cyan bg-cyan/10" : "border-slate-300"}`}
            >
              ⚖️ Cabinet d'avocats
            </button>
          </div>

          {needsCompanyDetails && (
            <div className="space-y-3">
              <Input placeholder="Raison sociale" value={state.data.companyName} onChange={(e) => dispatch({ type: "UPDATE", payload: { companyName: e.target.value } })} />
              {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
              <Input placeholder="Numero SIRET / ICE" value={state.data.companyId} onChange={(e) => dispatch({ type: "UPDATE", payload: { companyId: e.target.value } })} />
              {errors.companyId && <p className="text-sm text-red-500">{errors.companyId}</p>}
              <select
                value={state.data.sector}
                onChange={(e) => dispatch({ type: "UPDATE", payload: { sector: e.target.value } })}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
              >
                <option value="">Secteur d'activite</option>
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
              {errors.sector && <p className="text-sm text-red-500">{errors.sector}</p>}
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Domaine juridique principal</p>
            <div className="flex flex-wrap gap-2">
              {LEGAL_DOMAINS.map((domain) => {
                const selected = state.data.legalDomains.includes(domain);
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => {
                      const nextDomains = selected
                        ? state.data.legalDomains.filter((item) => item !== domain)
                        : [...state.data.legalDomains, domain];
                      dispatch({ type: "UPDATE", payload: { legalDomains: nextDomains } });
                    }}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      selected ? "border-cyan bg-cyan/10 text-cyan" : "border-slate-300 text-slate-600"
                    }`}
                  >
                    {selected && <Check className="mr-1 inline h-3 w-3" />}
                    {domain}
                  </button>
                );
              })}
            </div>
            {errors.legalDomains && <p className="mt-1 text-sm text-red-500">{errors.legalDomains}</p>}
          </div>
        </section>
      )}

      {state.step === 3 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Securite & Consentement</h2>
          <Input
            type="password"
            placeholder="Mot de passe"
            value={state.data.password}
            onChange={(e) => dispatch({ type: "UPDATE", payload: { password: e.target.value } })}
          />
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className={`h-full ${strength.color}`} style={{ width: strength.width }} />
            </div>
            <p className="text-xs text-slate-500">Niveau: {strength.label}</p>
          </div>
          {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}

          <Input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={state.confirmPassword}
            onChange={(e) => dispatch({ type: "SET_CONFIRM_PASSWORD", payload: e.target.value })}
          />
          {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}

          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={state.data.acceptsTerms}
              onChange={(e) => dispatch({ type: "UPDATE", payload: { acceptsTerms: e.target.checked } })}
              className="mt-1"
            />
            J'accepte les CGU et la politique de confidentialite
          </label>
          {errors.acceptsTerms && <p className="text-sm text-red-500">{errors.acceptsTerms}</p>}

          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={state.data.acceptsDataProcessing}
              onChange={(e) => dispatch({ type: "UPDATE", payload: { acceptsDataProcessing: e.target.checked } })}
              className="mt-1"
            />
            J'accepte le traitement de mes donnees (RGPD)
          </label>
          {errors.acceptsDataProcessing && <p className="text-sm text-red-500">{errors.acceptsDataProcessing}</p>}

          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={state.data.acceptsNewsletter}
              onChange={(e) => dispatch({ type: "UPDATE", payload: { acceptsNewsletter: e.target.checked } })}
              className="mt-1"
            />
            Je souhaite recevoir les newsletters JUSTIA (optional)
          </label>
        </section>
      )}

      {errors.general && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={goPrev} disabled={state.step === 1 || isSubmitting} className="flex-1">
          Precedent
        </Button>
        {state.step < 3 ? (
          <Button variant="gradient" onClick={goNext} className="flex-1">
            Suivant
          </Button>
        ) : (
          <Button variant="gradient" onClick={submit} className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creer mon compte"}
          </Button>
        )}
      </div>

      <p className="text-center text-sm text-slate-600 dark:text-slate-300">
        Membre de l&apos;equipe JUSTIA (avocats / staff) ?{" "}
        <Link to="/client-space/login?espace=expert" className="font-semibold text-cyan hover:underline">
          Connexion espace expert
        </Link>
      </p>

      <p className="text-center text-sm text-slate-600 dark:text-slate-300">
        Deja inscrit ?{" "}
        <Link to="/client-space/login" className="font-semibold text-cyan hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
  
}
