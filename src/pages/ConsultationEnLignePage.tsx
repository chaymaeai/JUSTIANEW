import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Lock,
  Quote,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Video,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTheme } from "../hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Lang = "fr" | "en" | "ar";
type WizardStep = 1 | 2 | 3 | 4;
type Urgency = "standard" | "priority";

interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  country: string;
}

interface FormDataState {
  domain: string;
  urgency: Urgency;
  description: string;
  contact: ContactData;
  consent: boolean;
}

interface ValidationState {
  domain?: string;
  description?: string;
  selectedDate?: string;
  selectedTime?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  consent?: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const DOMAINS = [
  "Droit des affaires",
  "RGPD / Cybersécurité",
  "Droit de l'IA",
  "Propriété intellectuelle",
  "Droit du numérique",
  "Contrats & contentieux",
];

const TIME_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:30"];
const UNAVAILABLE_SLOTS = ["11:00", "16:00"];

const WIZARD_STEPS = [
  { id: 1, label: "Domaine" },
  { id: 2, label: "Besoin" },
  { id: 3, label: "Créneau" },
  { id: 4, label: "Contact" },
] as const;

const HOW_IT_WORKS = [
  {
    title: "Choisissez votre besoin juridique",
    desc: "Droit des affaires, RGPD, IA, etc.",
    icon: Sparkles,
  },
  {
    title: "Réservez un créneau",
    desc: "Calendrier interactif, expert dédié ou généraliste",
    icon: Calendar,
  },
  {
    title: "Décrivez & joignez vos documents",
    desc: "Formulaire + drag & drop sécurisé",
    icon: FileUp,
  },
  {
    title: "Recevez votre lien visio + devis",
    desc: "Confirmation e-mail + accès à votre compte",
    icon: Video,
  },
];

const PRICING = [
  { title: "Consultation", subtitle: "Standard 45 min", price: "500 MAD", cta: "Réserver" },
  { title: "Urgence < 24h", subtitle: "Intervention prioritaire", price: "900 MAD", cta: "Réserver →" },
  { title: "Avis écrit", subtitle: "Détaillé", price: "Sur devis", cta: "Contacter" },
];

const GUARANTEES = [
  { icon: Lock, title: "Confidentialité & secret professionnel", desc: "Traitement strictement confidentiel de chaque dossier." },
  { icon: ShieldCheck, title: "Conformité RGPD / CNDP", desc: "Flux et stockage alignés avec les exigences réglementaires." },
  { icon: Check, title: "Paiement en ligne sécurisé", desc: "Paiement protégé et traçabilité de chaque transaction." },
  { icon: UserCheck, title: "Expertise vérifiée", desc: "Juristes et avocats sélectionnés et certifiés." },
  { icon: Video, title: "Visio chiffrée de bout en bout", desc: "Sessions vidéo protégées pour vos échanges sensibles." },
  { icon: Lock, title: "Données hébergées au Maroc / UE", desc: "Infrastructure conforme aux standards de souveraineté." },
];

const TESTIMONIALS = [
  { quote: "Support réactif, cadrage juridique clair et actionnable en 48h.", author: "Société Tech", role: "CEO" },
  { quote: "La prise de rendez-vous est fluide, l'expert était précis et pédagogique.", author: "Startup Fintech", role: "COO" },
  { quote: "Excellent accompagnement sur la conformité IA et les clauses contractuelles.", author: "Groupe Digital", role: "Directrice Juridique" },
];

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

const getNextSevenDays = () => {
  const days: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push(d);
  }
  return days;
};

const toISODate = (date: Date) => date.toISOString().split("T")[0];

export default function ConsultationEnLignePage() {
  const { isDark, setIsDark } = useTheme();
  const [currentLang, setCurrentLang] = useState<Lang>("fr");
  const [step, setStep] = useState<WizardStep>(1);
  const [direction, setDirection] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [dateWindowStart, setDateWindowStart] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({});
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormDataState>({
    domain: "",
    urgency: "standard",
    description: "",
    contact: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      country: "",
    },
    consent: false,
  });

  const days = useMemo(() => getNextSevenDays(), []);
  const visibleDays = days.slice(dateWindowStart, dateWindowStart + 7);

  const meetingPrice = formData.urgency === "priority" ? "900 MAD" : "500 MAD";
  const minDescriptionReached = formData.description.trim().length >= 20;

  const formatSlot = () => {
    const selected = days.find((day) => toISODate(day) === selectedDate);
    if (!selected || !selectedTime) return "Non sélectionné";
    const dateLabel = selected.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return `${dateLabel} - ${selectedTime}`;
  };

  const updateContact = (key: keyof ContactData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contact: { ...prev.contact, [key]: value },
    }));
  };

  const appendFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted = Array.from(fileList).filter((file) => file.size <= 10 * 1024 * 1024);
    setUploadedFiles((prev) => {
      const existing = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const unique = accepted.filter((file) => !existing.has(`${file.name}-${file.size}-${file.lastModified}`));
      return [...prev, ...unique];
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep = (targetStep: WizardStep) => {
    const errors: ValidationState = {};
    if (targetStep === 1 && !formData.domain) {
      errors.domain = "Sélectionnez un domaine juridique.";
    }
    if (targetStep === 2 && !minDescriptionReached) {
      errors.description = "Votre description doit contenir au moins 20 caractères.";
    }
    if (targetStep === 3) {
      if (!selectedDate) errors.selectedDate = "Sélectionnez une date.";
      if (!selectedTime) errors.selectedTime = "Sélectionnez un horaire.";
    }
    if (targetStep === 4) {
      if (!formData.contact.firstName.trim()) errors.firstName = "Prénom requis.";
      if (!formData.contact.lastName.trim()) errors.lastName = "Nom requis.";
      if (!/.+@.+\..+/.test(formData.contact.email)) errors.email = "Email invalide.";
      if (!formData.consent) errors.consent = "Veuillez accepter la politique de confidentialité.";
    }
    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < 4) {
      setDirection(1);
      setStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const goPrev = () => {
    if (step > 1) {
      setDirection(-1);
      setValidation({});
      setStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleSubmit = async () => {
  setSubmitError("");
  setSubmitSuccess("");
  if (!validateStep(4)) {
    setSubmitError("Complétez les champs requis");
    return;
  }

  try {
    setSubmitting(true);
    const { api } = await import("@/services/api");

    await api.post("/consultations/public-request/", {
      domain: formData.domain === "Droit des affaires" ? "droit_affaires"
        : formData.domain === "RGPD / Cybersécurité" ? "rgpd"
        : formData.domain === "Droit de l'IA" ? "droit_ia"
        : formData.domain === "Propriété intellectuelle" ? "propriete_intellectuelle"
        : formData.domain === "Droit du numérique" ? "droit_numerique"
        : formData.domain === "Contrats & contentieux" ? "droit_affaires"
        : "droit_affaires",
      urgency: formData.urgency === "priority" ? "urgente" : "normale",
      description: formData.description,
      scheduled_at: `${selectedDate}T${selectedTime}:00`,
      contact_first_name: formData.contact.firstName,
      contact_last_name: formData.contact.lastName,
      contact_email: formData.contact.email,
      contact_phone: formData.contact.phone,
      notes: `Entreprise: ${formData.contact.company} | Pays: ${formData.contact.country}`,
    });

    setSubmitSuccess("✅ Votre demande a bien été envoyée. Vous recevrez une confirmation par email.");
  } catch (error: any) {
    const msg = error?.response?.data?.detail || 
                Object.values(error?.response?.data || {})[0] ||
                "Impossible d'envoyer la demande pour le moment.";
    setSubmitError(String(msg));
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header lang={currentLang} setLang={setCurrentLang} isDark={isDark} setIsDark={setIsDark} />

      <main>
        <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-[#001A33] py-20 md:py-28">
          <div className="pointer-events-none absolute right-[12%] top-[18%] h-72 w-72 rounded-full bg-[#00B2FF]/20 blur-3xl" />
          <div className={`${container} grid items-center gap-12 md:grid-cols-2`}>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="space-y-7"
            >
              <div className="inline-flex items-center rounded-full border border-[#00B2FF] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#8adfff]">
                JUSTIA • LegalTech
              </div>
              <h1 className="font-['Playfair_Display'] text-4xl leading-tight text-white md:text-6xl">
                Obtenez une réponse juridique personnalisée, sans vous déplacer.
              </h1>
              <p className="max-w-xl text-lg text-slate-300">
                Prenez rendez-vous avec nos juristes, avocats ou experts en conformité IA/tech.
              </p>
              <Button
                onClick={() => document.getElementById("consultation-wizard")?.scrollIntoView({ behavior: "smooth" })}
                className="h-14 rounded-full bg-[#00B2FF] px-8 text-base font-semibold text-[#001A33] hover:bg-[#3dc7ff]"
              >
                Commencer une consultation <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
              className="hidden md:block"
            >
              <div className="rounded-2xl border border-white/15 bg-slate-950/60 p-8 shadow-2xl backdrop-blur">
                <div className="mb-6 flex items-center gap-3 text-white">
                  <Video className="h-5 w-5 text-[#00B2FF]" />
                  <p className="text-lg font-semibold">Visio sécurisée</p>
                </div>
                <ul className="space-y-3 text-slate-200">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#00D4AA]" /> Confidentialité garantie</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#00D4AA]" /> Experts vérifiés</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#00D4AA]" /> Paiement sécurisé</li>
                </ul>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((avatar) => (
                      <div key={avatar} className="h-9 w-9 rounded-full border-2 border-[#001A33] bg-gradient-to-br from-[#00B2FF] to-[#00D4AA]" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300">500+ clients accompagnés</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-[#F8FAFC] py-20 md:py-28">
          <div className={container}>
            <motion.h2
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="mb-14 text-center font-['Playfair_Display'] text-4xl text-[#001A33]"
            >
              Comment ça fonctionne ?
            </motion.h2>
            <div className="grid gap-6 md:grid-cols-4">
              {HOW_IT_WORKS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    {index < HOW_IT_WORKS.length - 1 && (
                      <div className="absolute right-[-20%] top-8 hidden h-px w-[40%] border-t-2 border-dashed border-[#00B2FF]/50 md:block" />
                    )}
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#00B2FF] text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <Icon className="mb-4 h-8 w-8 text-[#001A33]" />
                    <h3 className="mb-2 text-base font-semibold text-[#001A33]">{item.title}</h3>
                    <p className="text-sm text-slate-600">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="consultation-wizard" className="bg-white py-20 md:py-28">
          <div className={container}>
            <div className="wizard-card mx-auto max-w-3xl rounded-3xl border border-slate-100 p-6 shadow-2xl md:p-10">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex flex-1 items-center gap-2 md:gap-4">
                  {WIZARD_STEPS.map((item, idx) => {
                    const completed = step > item.id;
                    const current = step === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <div className="flex flex-col items-center gap-2">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                              completed
                                ? "border-[#00B2FF] bg-[#00B2FF] text-white"
                                : current
                                ? "animate-pulse border-[#00B2FF] text-[#00B2FF]"
                                : "border-slate-300 text-slate-400"
                            }`}
                          >
                            {completed ? <Check className="h-4 w-4" /> : item.id}
                          </span>
                          <span className="text-[11px] text-slate-500 md:text-xs">{item.label}</span>
                        </div>
                        {idx < WIZARD_STEPS.length - 1 && (
                          <div className="h-1 flex-1 rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${step > item.id ? "bg-[#00B2FF]" : "bg-transparent"}`}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="ml-4 flex rounded-full border border-slate-200 p-1">
                  {(["fr", "en", "ar"] as const).map((lng) => (
                    <button
                      key={lng}
                      type="button"
                      onClick={() => setCurrentLang(lng)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                        currentLang === lng ? "bg-[#001A33] text-white" : "text-slate-500"
                      }`}
                    >
                      {lng}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {step === 1 && (
                    <div className="space-y-6">
                      <h3 className="font-['Playfair_Display'] text-3xl text-[#001A33]">Domaine juridique & Urgence</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {DOMAINS.map((domain) => (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, domain }))}
                            className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
                              formData.domain === domain
                                ? "border-[#001A33] bg-[#001A33] text-white shadow-[inset_4px_0_0_0_#00B2FF]"
                                : "border-[#001A33] bg-white text-[#001A33] hover:bg-slate-50"
                            }`}
                          >
                            {domain}
                          </button>
                        ))}
                      </div>
                      {validation.domain && <p className="text-sm text-red-600">{validation.domain}</p>}

                      <div className="rounded-xl border border-slate-200 p-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, urgency: "standard" }))}
                            className={`rounded-lg px-4 py-3 text-sm ${
                              formData.urgency === "standard" ? "bg-[#001A33] text-white" : "bg-white text-slate-600"
                            }`}
                          >
                            Standard
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, urgency: "priority" }))}
                            className={`rounded-lg px-4 py-3 text-sm ${
                              formData.urgency === "priority" ? "bg-[#001A33] text-white" : "bg-white text-slate-600"
                            }`}
                          >
                            Prioritaire (&lt; 24h) <span className="ml-1 rounded-full bg-[#00B2FF]/15 px-2 py-0.5 text-xs text-[#001A33]">+400 MAD</span>
                          </button>
                        </div>
                      </div>

                      <Button onClick={goNext} className="h-12 w-full rounded-full bg-[#00B2FF] text-[#001A33] hover:bg-[#35c6ff]">
                        Suivant <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <h3 className="font-['Playfair_Display'] text-3xl text-[#001A33]">Description & Fichiers</h3>
                      <div>
                        <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-700">
                          Décrivez votre situation
                        </label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, description: event.target.value }))
                          }
                          placeholder="Ex: Je cherche à protéger ma marque en France et au Maroc..."
                          className="min-h-[140px] rounded-xl border-2 border-slate-200 p-4 focus:border-[#00B2FF] focus-visible:ring-[#00B2FF]/20"
                        />
                        <p className={`mt-2 text-right text-sm ${minDescriptionReached ? "text-emerald-600" : "text-slate-500"}`}>
                          {formData.description.trim().length} / 20 minimum
                        </p>
                        {validation.description && <p className="text-sm text-red-600">{validation.description}</p>}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => appendFiles(event.target.files)}
                      />
                      <div
                        onDragOver={(event) => {
                          event.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsDragOver(false);
                          appendFiles(event.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                          isDragOver
                            ? "scale-[1.02] border-solid border-[#00B2FF] bg-[#E0F5FF]"
                            : "border-[#00B2FF] bg-[#F0FAFF]"
                        }`}
                      >
                        <FileUp className="mx-auto mb-3 h-6 w-6 text-[#00B2FF]" />
                        <p className="text-sm font-medium text-[#001A33]">Glissez-deposez vos fichiers ici</p>
                        <p className="text-sm text-slate-600">ou cliquez pour selectionner</p>
                        <p className="mt-2 text-xs text-slate-500">PDF, DOCX, JPG - max 10 MB</p>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          {uploadedFiles.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                              <span className="truncate text-slate-700">{file.name}</span>
                              <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={goPrev} className="h-12 flex-1 rounded-full border-slate-300">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                        </Button>
                        <Button onClick={goNext} className="h-12 flex-1 rounded-full bg-[#00B2FF] text-[#001A33] hover:bg-[#35c6ff]">
                          Suivant <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <h3 className="font-['Playfair_Display'] text-3xl text-[#001A33]">Choix du créneau</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setDateWindowStart((prev) => Math.max(0, prev - 1))}
                          className="rounded-full"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
                          {visibleDays.map((date) => {
                            const iso = toISODate(date);
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            const selected = selectedDate === iso;
                            return (
                              <button
                                key={iso}
                                type="button"
                                disabled={isWeekend}
                                onClick={() => {
                                  setSelectedDate(iso);
                                  setSelectedTime("");
                                }}
                                className={`min-w-[95px] rounded-xl px-3 py-2 text-sm transition ${
                                  isWeekend
                                    ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                    : selected
                                    ? "bg-[#001A33] text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                <p>{date.toLocaleDateString("en-US", { weekday: "short" })}</p>
                                <p className="font-semibold">{date.getDate()}</p>
                              </button>
                            );
                          })}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setDateWindowStart((prev) => Math.min(days.length - 7, prev + 1))}
                          className="rounded-full"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      {validation.selectedDate && <p className="text-sm text-red-600">{validation.selectedDate}</p>}

                      <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                        {TIME_SLOTS.map((slot) => {
                          const unavailable = UNAVAILABLE_SLOTS.includes(slot);
                          const selected = selectedTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={unavailable}
                              onClick={() => setSelectedTime(slot)}
                              className={`rounded-full px-4 py-2 text-sm ${
                                unavailable
                                  ? "cursor-not-allowed line-through opacity-40"
                                  : selected
                                  ? "bg-[#00B2FF] text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                      {validation.selectedTime && <p className="text-sm text-red-600">{validation.selectedTime}</p>}

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={goPrev} className="h-12 flex-1 rounded-full border-slate-300">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                        </Button>
                        <Button onClick={goNext} className="h-12 flex-1 rounded-full bg-[#00B2FF] text-[#001A33] hover:bg-[#35c6ff]">
                          Suivant <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6">
                      <h3 className="font-['Playfair_Display'] text-3xl text-[#001A33]">Vos coordonnées & Confirmation</h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {[
                          { key: "firstName", label: "Prénom*", required: true },
                          { key: "lastName", label: "Nom*", required: true },
                          { key: "email", label: "Email*", required: true },
                          { key: "phone", label: "Téléphone", required: false },
                          { key: "company", label: "Entreprise", required: false },
                          { key: "country", label: "Pays", required: false },
                        ].map((field) => (
                          <div key={field.key} className="relative">
                            <Input
                              value={formData.contact[field.key as keyof ContactData]}
                              onChange={(event) =>
                                updateContact(field.key as keyof ContactData, event.target.value)
                              }
                              className="peer h-12 rounded-xl border-2 border-slate-200 px-4 pt-4 focus:border-[#00B2FF] focus-visible:ring-[#00B2FF]/20"
                              placeholder=" "
                              type={field.key === "email" ? "email" : "text"}
                            />
                            <label className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded bg-white px-1 text-sm text-slate-500 transition-all peer-focus:top-0 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs">
                              {field.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      {(validation.firstName || validation.lastName || validation.email) && (
                        <p className="text-sm text-red-600">
                          {validation.firstName || validation.lastName || validation.email}
                        </p>
                      )}

                      <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
                        <Switch
                          checked={formData.consent}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({ ...prev, consent: checked }))
                          }
                          className="mt-0.5"
                        />
                        <p className="text-sm text-slate-700">
                          J'accepte la politique de confidentialité et le traitement de mes données personnelles.
                        </p>
                      </div>
                      {validation.consent && <p className="text-sm text-red-600">{validation.consent}</p>}

                      <div className="rounded-xl border-l-4 border-[#00B2FF] bg-slate-50 p-4">
                        <p className="mb-2 text-sm font-semibold text-[#001A33]">Récapitulatif</p>
                        <div className="space-y-1 text-sm text-slate-700">
                          <p>Domaine: {formData.domain || "Non sélectionné"}</p>
                          <p>Urgence: {formData.urgency === "priority" ? "Prioritaire (&lt; 24h)" : "Standard"}</p>
                          <p>Créneau: {formatSlot()}</p>
                          <p>Tarif: {meetingPrice}</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={goPrev} className="h-12 flex-1 rounded-full border-slate-300">
                          <ArrowLeft className="mr-2 h-4 w-4" /> Précédent
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="h-12 flex-1 rounded-full bg-[#001A33] font-['Playfair_Display'] text-lg text-white hover:bg-[#002a50]"
                        >
                          {submitting ? (
                            <>
                              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              Envoi...
                            </>
                          ) : (
                            "Envoyer la demande"
                          )}
                        </Button>
                      </div>
                      {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                      {submitSuccess && <p className="text-sm text-emerald-600">{submitSuccess}</p>}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section className="bg-[#F8FAFC] py-20 md:py-28">
          <div className={container}>
            <h2 className="mb-3 text-center font-['Playfair_Display'] text-4xl text-[#001A33]">Tarification claire</h2>
            <p className="mb-12 text-center text-slate-600">Premier échange offert pour start-ups (sous conditions).</p>
            <div className="grid gap-6 md:grid-cols-3">
              {PRICING.map((card, index) => (
                <motion.div
                  key={card.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className={`rounded-2xl border p-8 shadow-md transition hover:shadow-xl ${
                    index === 1
                      ? "scale-[1.05] border-[#001A33] bg-[#001A33] text-white"
                      : "border-slate-200 bg-white text-[#001A33]"
                  }`}
                >
                  {index === 1 && (
                    <span className="mb-4 inline-flex rounded-full bg-[#00B2FF] px-3 py-1 text-xs font-semibold text-[#001A33]">
                      Populaire
                    </span>
                  )}
                  <h3 className="text-xl font-semibold">{card.title}</h3>
                  <p className={`mt-1 text-sm ${index === 1 ? "text-slate-300" : "text-slate-500"}`}>{card.subtitle}</p>
                  <p className="mt-6 font-['Playfair_Display'] text-4xl">{card.price}</p>
                  <Button
                    className={`mt-6 h-11 w-full rounded-full ${
                      index === 1
                        ? "bg-[#00B2FF] text-[#001A33] hover:bg-[#35c6ff]"
                        : "bg-[#001A33] text-white hover:bg-[#002a50]"
                    }`}
                  >
                    {card.cta}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 md:py-28">
          <div className={container}>
            <h2 className="mb-12 text-left font-['Playfair_Display'] text-4xl text-[#001A33]">Nos garanties</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {GUARANTEES.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#00B2FF]/15">
                      <Icon className="h-5 w-5 text-[#00B2FF]" />
                    </div>
                    <h3 className="font-semibold text-[#001A33]">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[#001A33] py-20 md:py-28">
          <div className={container}>
            <h2 className="mb-12 text-center font-['Playfair_Display'] text-4xl text-white">Ils nous font confiance</h2>
            <div className="flex snap-x gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
              {TESTIMONIALS.map((item) => (
                <div
                  key={item.author}
                  className="relative min-w-[280px] snap-start rounded-2xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur"
                >
                  <Quote className="absolute right-5 top-4 h-10 w-10 text-[#00B2FF]/40" />
                  <p className="mb-5 text-sm leading-6">★★★★★</p>
                  <p className="relative z-10 text-sm leading-6">"{item.quote}"</p>
                  <div className="mt-5 border-t border-white/10 pt-4 text-sm">
                    <p className="font-semibold">{item.author}</p>
                    <p className="text-slate-300">{item.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className={container}>
            <div className="rounded-3xl bg-gradient-to-r from-[#00B2FF] to-[#00D4AA] px-6 py-12 text-center md:px-10">
              <h2 className="font-['Playfair_Display'] text-3xl text-[#001A33] md:text-4xl">
                Prêt à consulter un expert dès aujourd'hui ?
              </h2>
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2.4, ease: "easeInOut" }}
                className="mt-6 inline-block"
              >
                <Button
                  onClick={() => document.getElementById("consultation-wizard")?.scrollIntoView({ behavior: "smooth" })}
                  className="h-12 rounded-full bg-white px-7 text-[#001A33] shadow-lg hover:bg-slate-100"
                >
                  Planifier une consultation maintenant <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer lang={currentLang} isDark={isDark} />
    </div>
  );
}
