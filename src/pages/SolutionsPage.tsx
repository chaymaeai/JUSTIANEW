import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTheme } from "../hooks/useTheme";
import {
  HIDDEN_SOLUTION_NAMES,
  isSolutionIdHidden,
} from "../config/solutionVisibility";
type Lang = "fr" | "en" | "ar";
type SolutionCategory =
  | "Toutes"
  | "Cabinets d'avocats"
  | "Grand public"
  | "Immobilier"
  | "Gouvernance";
type CtaKind = "primary" | "ghost";
type CtaAction = "demo" | "docs" | "view" | "trial" | "ai" | "presentation";

interface Solution {
  id: string;
  name: string;
  audience: string;
  description: string;
  techStack: string[];
  features: string[];
  badges: [string, string];
  ctas: { label: string; kind: CtaKind; action: CtaAction }[];
  color: string;
  category: Exclude<SolutionCategory, "Toutes">;
  initials: string;
}

const STRINGS = {
  fr: {
    faqTitle: "FAQ Technique",
  },
  en: {
    faqTitle: "Technical FAQ",
  },
  ar: {
    faqTitle: "الاسئلة التقنية",
  },
} as const;

const SOLUTIONS_DATA: Solution[] = [
  {
    id: "jure",
    name: "JURE",
    audience: "Cabinets d'avocats · Juristes",
    description:
      "Gestion des cabinets : dossiers, clients, tâches, bibliothèque, messagerie.",
    techStack: ["React", "Django", "PostgreSQL"],
    features: [
      "Gestion multi-dossiers & clients",
      "Tableau de bord temps réel",
      "Messagerie interne & pièces jointes",
      "Bibliothèque juridique",
    ],
    badges: ["Essai gratuit ✅", "Démo live ✅"],
    ctas: [
      { label: "Voir les fonctionnalités", kind: "primary", action: "view" },
      { label: "Essai gratuit", kind: "ghost", action: "trial" },
    ],
    color: "#00B2FF",
    category: "Cabinets d'avocats",
    initials: "J",
  },
  {
    id: "juria",
    name: "JURIA",
    audience: "Grand public & avocats",
    description:
      "Assistant IA juridique : chatbot, résumé de documents, recherche RAG.",
    techStack: ["LangChain", "RAG", "Azure/OpenAI"],
    features: [
      "Chatbot juridique fiable",
      "Résumé & extraction de clauses",
      "Recherche contextuelle (RAG)",
      "Traçabilité & citations",
    ],
    badges: ["Essai gratuit ✅", "Démo live ✅"],
    ctas: [
      { label: "Voir la démo", kind: "primary", action: "demo" },
      { label: "Interroger l'IA", kind: "ghost", action: "ai" },
    ],
    color: "#00D4AA",
    category: "Grand public",
    initials: "JA",
  },
  {
    id: "locaris",
    name: "LOCARIS",
    audience: "Promoteurs · Agences · Syndics",
    description:
      "LegalTech immobilier : lots, baux, copropriété, syndics, conformité.",
    techStack: ["React", "Django", "PostgreSQL"],
    features: [
      "Gestion de lots & contrats",
      "Règlements de copropriété",
      "Workflow syndics",
      "Export & reporting",
    ],
    badges: ["Essai gratuit ✅", "Démo sur demande"],
    ctas: [
      { label: "Découvrir la plateforme", kind: "primary", action: "view" },
      { label: "Demander une démo", kind: "ghost", action: "demo" },
    ],
    color: "#F59E0B",
    category: "Immobilier",
    initials: "L",
  },
  {
    id: "compania",
    name: "COMPANIA",
    audience: "Holdings · Groupes internationaux",
    description:
      "Gouvernance des groupes : PV, conseils, filiales, audit & conformité.",
    techStack: ["React", "Django", "PostgreSQL"],
    features: [
      "Tenue des PV & registres",
      "Calendrier des instances",
      "Suivi des filiales",
      "Audit & conformité",
    ],
    badges: ["Présentation sur demande", "Démo live ✅"],
    ctas: [
      {
        label: "Demander une présentation",
        kind: "primary",
        action: "presentation",
      },
      { label: "Voir les modules", kind: "ghost", action: "view" },
    ],
    color: "#8B5CF6",
    category: "Gouvernance",
    initials: "C",
  },
];

const SOLUTIONS_VISIBLE = SOLUTIONS_DATA.filter((s) => !isSolutionIdHidden(s.id));

const DEMO_CARDS_ALL: [string, string][] = [
  ["JURE – Dashboard", "Gestion de dossiers"],
  ["JURIA – Chat IA & RAG", "IA Juridique"],
  ["LOCARIS – Lots & Baux", "Immobilier"],
  ["COMPANIA – Gouvernance", "Gouvernance"],
];

const DEMO_CARDS_VISIBLE = DEMO_CARDS_ALL.filter(([title]) => {
  const head = title.split(/\s*[–-]\s*/)[0]?.trim() ?? "";
  return !HIDDEN_SOLUTION_NAMES.has(head.toUpperCase());
});

const COMPARISON_ROWS_ALL: [string, string, string, string, string][] = [
  ["JURE", "Avocats, juristes", "Dossiers, clients, tâches", "✅", "✅"],
  ["JURIA", "Grand public", "Chatbot, résumé, RAG", "✅", "✅"],
  ["LOCARIS", "Promoteurs, syndics", "Copropriété, bail", "✅", "❌"],
  ["COMPANIA", "Holdings, groupes", "PV, gouvernance, audit", "❌", "✅"],
];

const COMPARISON_ROWS_VISIBLE = COMPARISON_ROWS_ALL.filter(([product]) =>
  !HIDDEN_SOLUTION_NAMES.has(product),
);

const TESTIMONIALS: {
  name: string;
  role: string;
  quote: string;
  hidden?: boolean;
}[] = [
  {
    name: "Me. Dupont",
    role: "Managing Partner",
    quote:
      "Grâce à JUSTIA, nous avons réduit de 40% le temps de préparation des dossiers et renforcé la conformité.",
  },
  {
    name: "Me. Leroux",
    role: "Directrice Juridique",
    quote:
      "JURIA a amélioré nos recherches documentaires avec des citations claires et un gain de temps immédiat.",
  },
  {
    name: "Me. Ait El Haj",
    role: "Responsable Conformité",
    quote:
      "LOCARIS et COMPANIA nous donnent enfin une vision structurée de nos workflows et obligations multi-entités.",
    hidden: true,
  },
];

const TESTIMONIALS_VISIBLE = TESTIMONIALS.filter((t) => !t.hidden);

const FAQ_ITEMS = [
  {
    q: "Puis-je intégrer JURE à mon CRM ?",
    a: "Oui, JURE expose une API REST documentée compatible avec les principaux CRM (Salesforce, HubSpot). SSO disponible.",
  },
  {
    q: "Quelle sécurité pour mes données ?",
    a: "Chiffrement AES-256 au repos, TLS 1.3 en transit. Hébergement conforme RGPD, audits réguliers, CNDP-compatible.",
  },
  {
    q: "JURIA cite-t-elle ses sources ?",
    a: "Oui. Chaque réponse du chatbot inclut des citations traçables vers les textes de loi et jurisprudences utilisés (RAG transparent).",
  },
];

const FILTERS: SolutionCategory[] = [
  "Toutes",
  "Cabinets d'avocats",
  "Grand public",
  "Immobilier",
  "Gouvernance",
];

const sectionClass = "py-20 md:py-28";

const Container = ({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
);

const MotionSection = ({
  children,
  className = "",
  id,
}: React.PropsWithChildren<{ className?: string; id?: string }>) => (
  <motion.section
    id={id}
    className={`${sectionClass} ${className}`}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.55, ease: "easeOut" }}
  >
    {children}
  </motion.section>
);

export default function SolutionsPage() {
  const [currentLang, setCurrentLang] = useState<Lang>("fr");
  const [activeFilter, setActiveFilter] = useState<SolutionCategory>("Toutes");
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mobileCardDot, setMobileCardDot] = useState(0);
  const [demoDot, setDemoDot] = useState(0);
  const { isDark, setIsDark } = useTheme();
  const productScrollRef = useRef<HTMLDivElement | null>(null);
  const demoScrollRef = useRef<HTMLDivElement | null>(null);
  const text = STRINGS[currentLang];

  const filterTabs = useMemo(() => {
    const used = new Set(
      SOLUTIONS_VISIBLE.map((s) => s.category),
    );
    return FILTERS.filter((f) => f === "Toutes" || used.has(f));
  }, []);

  useEffect(() => {
    if (!filterTabs.includes(activeFilter)) setActiveFilter("Toutes");
  }, [filterTabs, activeFilter]);

  const demoMaxIdx = Math.max(0, DEMO_CARDS_VISIBLE.length - 1);

  useEffect(() => {
    setActiveTestimonial((i) =>
      Math.min(i, Math.max(0, TESTIMONIALS_VISIBLE.length - 1)),
    );
  }, []);

  useEffect(() => {
    setDemoDot((d) => Math.min(d, demoMaxIdx));
  }, [demoMaxIdx]);

  const filteredSolutions = useMemo(() => {
    if (activeFilter === "Toutes") return SOLUTIONS_VISIBLE;
    return SOLUTIONS_VISIBLE.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const handleCtaClick = (label: string, action: CtaAction) => {
    console.log("Solutions CTA clicked", { label, action });
    setToastMsg(`Action: ${label}`);
    window.setTimeout(() => setToastMsg(null), 2200);
  };

  const goToScrollCard = (
    ref: React.MutableRefObject<HTMLDivElement | null>,
    index: number,
  ) => {
    if (!ref.current) return;
    const width = ref.current.clientWidth;
    ref.current.scrollTo({
      left: index * Math.max(width * 0.88, 1),
      behavior: "smooth",
    });
  };

  return (
    <div className={isDark ? "min-h-screen bg-[#001A33] text-white" : "min-h-screen bg-white text-slate-900"}>
      <Header
        lang={currentLang}
        setLang={setCurrentLang}
        isDark={isDark}
        setIsDark={setIsDark}
      />
      <main className="font-['DM_Sans']">
        {/* SECTION: 1 HERO */}
        <section className="relative min-h-[80vh] bg-[#001A33] pt-24">
          <Container className="grid items-center gap-12 py-12 md:grid-cols-[55%_45%] md:py-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-cyan-200">
                Solutions LegalTech — JUSTIA
              </span>
              <h1 className="mt-6 font-['Playfair_Display'] text-4xl leading-tight text-white md:text-5xl">
                Des plateformes intelligentes pour moderniser votre pratique juridique.
              </h1>
              <p className="mt-5 max-w-2xl text-base text-slate-300">
                Automatisez, analysez et sécurisez vos processus avec nos outils
                développés par des experts en droit, IA et conformité.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={() => handleCtaClick("Demander une démo", "demo")}
                  className="rounded-full bg-[#00B2FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0aaeff]"
                >
                  Demander une démo
                </button>
                <button
                  onClick={() =>
                    handleCtaClick("Accéder à la documentation", "docs")
                  }
                  className="rounded-full border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Accéder à la documentation
                </button>
              </div>
            </motion.div>

            <motion.div
              className="relative hidden md:block"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              animate={{ y: [0, -8, 0] }}
              transition={{
                opacity: { duration: 0.5 },
                y: { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
              }}
            >
              <div className="absolute inset-0 rounded-2xl shadow-[0_0_80px_rgba(0,178,255,0.15)]" />
              <div className="relative overflow-hidden rounded-2xl border border-[#12395e] bg-[#0A2540] p-5 shadow-2xl">
                <div className="mb-5 flex items-center gap-2 border-b border-white/10 pb-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-slate-300">JUSTIA Platform</span>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((r) => (
                    <div key={r} className="rounded-xl bg-white/5 p-3">
                      <div className="mb-2 flex gap-2">
                        <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] text-cyan-200">Dossier</span>
                        <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] text-teal-200">IA</span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-200">Conformité</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className={`h-2 rounded-full bg-[#00B2FF] ${r % 2 === 0 ? "w-2/3" : "w-5/6"}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex gap-3">
                  <button className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-slate-200">JURE</button>
                  <button className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-slate-200">JURIA</button>
                </div>
              </div>
            </motion.div>
          </Container>
        </section>

        {/* SECTION: 2 USP PILLS ROW */}
        <MotionSection className="bg-white">
          <Container className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                icon: "🤖",
                title: "IA & RAG Intégré",
                desc: "Recherche augmentée, résumé, chatbot juridique",
              },
              {
                icon: "🔒",
                title: "Sécurité Niveau Pro",
                desc: "Chiffrement, RGPD, hébergement souverain",
              },
              {
                icon: "⚡",
                title: "Déploiement Rapide",
                desc: "SaaS clé en main, API-ready, multi-tenant",
              },
            ].map((item, idx) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.45 }}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <p className="text-2xl">{item.icon}</p>
                <h3 className="mt-3 text-lg font-bold text-[#001A33]">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </motion.article>
            ))}
          </Container>
        </MotionSection>

        {/* SECTION: 3 PRODUCT FILTER + CARD GRID */}
        <MotionSection className="bg-slate-50" id="solutions-grid">
          <Container>
            <h2 className="font-['Playfair_Display'] text-3xl text-[#001A33] md:text-5xl">
              Nos Solutions Principales
            </h2>
            <p className="mt-3 text-slate-600">
              Choisissez la plateforme adaptée à votre activité.
            </p>

            <div className="sticky top-20 z-20 mt-8 overflow-x-auto rounded-full bg-white/95 p-2 shadow-sm backdrop-blur">
              <div className="flex min-w-max gap-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveFilter(tab);
                      setMobileCardDot(0);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeFilter === tab
                        ? "bg-[#001A33] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 hidden grid-cols-1 gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
              {filteredSolutions.map((solution) => (
                <article
                  key={solution.id}
                  className="rounded-2xl bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{ borderTop: `4px solid ${solution.color}` }}
                >
                  <div className="p-6">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {solution.audience}
                    </span>
                    <div className="mt-4 flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: solution.color }}
                      >
                        {solution.initials}
                      </div>
                      <h3 className="text-2xl font-bold text-[#001A33]">{solution.name}</h3>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{solution.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {solution.techStack.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                    <ul className="mt-4 space-y-2">
                      {solution.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="mt-0.5 h-4 w-4 text-[#00D4AA]" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                        {solution.badges[0]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                        {solution.badges[1]}
                      </span>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {solution.ctas.map((cta) => (
                        <button
                          key={cta.label}
                          onClick={() => handleCtaClick(cta.label, cta.action)}
                          className={
                            cta.kind === "primary"
                              ? "rounded-full bg-[#001A33] px-4 py-2 text-sm font-semibold text-white"
                              : "rounded-full border border-[#001A33] px-4 py-2 text-sm font-semibold text-[#001A33]"
                          }
                        >
                          {cta.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div
              ref={productScrollRef}
              className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:hidden"
              onScroll={(e) => {
                const el = e.currentTarget;
                const idx = Math.round(el.scrollLeft / Math.max(el.clientWidth * 0.88, 1));
                setMobileCardDot(Math.max(0, Math.min(idx, filteredSolutions.length - 1)));
              }}
            >
              {filteredSolutions.map((solution) => (
                <article
                  key={solution.id}
                  className="w-[88%] shrink-0 snap-center rounded-2xl bg-white shadow-md"
                  style={{ borderTop: `4px solid ${solution.color}` }}
                >
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-[#001A33]">{solution.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">{solution.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-4 flex justify-center gap-2 md:hidden">
              {filteredSolutions.map((_, idx) => (
                <button
                  key={`p-${idx}`}
                  onClick={() => goToScrollCard(productScrollRef, idx)}
                  className={`h-2.5 rounded-full transition ${mobileCardDot === idx ? "w-7 bg-[#00B2FF]" : "w-2.5 bg-slate-300"}`}
                />
              ))}
            </div>
          </Container>
        </MotionSection>

        {/* SECTION: 4 HOW IT WORKS */}
        <MotionSection className="bg-white">
          <Container className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-[80px] leading-none text-[#00B2FF]">"</p>
              <h2 className="font-['Playfair_Display'] text-4xl text-[#001A33] md:text-5xl">
                Comment démarrer avec nos solutions ?
              </h2>
            </div>
            <div>
              {[
                ["1", "Choisissez votre solution", "JURE ou JURIA selon votre métier."],
                ["2", "Demandez une démo ou un essai", "Accès immédiat ou démonstration guidée par notre équipe."],
                ["3", "Intégrez à vos outils existants", "API, SSO, connecteurs CRM, export PDF/Excel."],
                ["4", "Bénéficiez du support expert", "Onboarding, formation, SLA et mises à jour continues."],
              ].map(([n, title, desc], idx) => (
                <div key={title} className={`py-5 ${idx !== 0 ? "border-t border-slate-200" : ""}`}>
                  <p className="text-lg font-bold text-[#00B2FF]">{n}</p>
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </MotionSection>

        {/* SECTION: 5 TESTIMONIALS */}
        <MotionSection className="bg-[#F9FAFB]">
          <Container>
            <h2 className="font-['Playfair_Display'] text-3xl text-[#001A33] md:text-5xl">
              Ils nous font confiance
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3 opacity-50">
              {["ALPHA", "BETA", "GAMMA", "DELTA", "EPSILON", "ZETA"].map((logo) => (
                <span key={logo} className="rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  {logo}
                </span>
              ))}
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-[35%_65%]">
              <div className="relative hidden min-h-[220px] md:block">
                <div className="absolute left-3 top-2 h-28 w-44 rotate-[-8deg] rounded-2xl bg-white/80 shadow-sm blur-[0.5px]" />
                <div className="absolute left-10 top-10 h-28 w-44 rotate-[5deg] rounded-2xl bg-white/80 shadow-sm blur-[1px]" />
                <div className="absolute left-0 top-20 h-28 w-44 rotate-[-3deg] rounded-2xl bg-white/80 shadow-sm blur-[1.5px]" />
              </div>
              <article className="rounded-2xl bg-white p-7 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#001A33] text-sm font-bold text-white">
                    {TESTIMONIALS_VISIBLE[activeTestimonial].name.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{TESTIMONIALS_VISIBLE[activeTestimonial].name}</p>
                    <p className="text-xs text-slate-500">{TESTIMONIALS_VISIBLE[activeTestimonial].role}</p>
                  </div>
                  <p className="ml-auto text-yellow-500">★★★★★</p>
                </div>
                <p className="mt-4 text-slate-700">{TESTIMONIALS_VISIBLE[activeTestimonial].quote}</p>
                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={() =>
                      setActiveTestimonial(
                        (prev) =>
                          (prev + TESTIMONIALS_VISIBLE.length - 1) %
                          TESTIMONIALS_VISIBLE.length,
                      )
                    }
                    className="rounded-full border border-slate-200 p-2 text-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveTestimonial(
                        (prev) => (prev + 1) % TESTIMONIALS_VISIBLE.length,
                      )
                    }
                    className="rounded-full border border-slate-200 p-2 text-slate-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button className="mt-5 rounded-full bg-[#001A33] px-5 py-2 text-sm font-semibold text-white">
                  Voir plus de retours →
                </button>
              </article>
            </div>
          </Container>
        </MotionSection>

        {/* SECTION: 6 STATS + ABOUT BLOCK */}
        <MotionSection className="bg-white">
          <Container className="grid gap-10 lg:grid-cols-2">
            <div>
              {[
                ["40% Gain de temps", "sur la préparation des dossiers"],
                [
                  `${SOLUTIONS_VISIBLE.length} Plateforme${SOLUTIONS_VISIBLE.length > 1 ? "s" : ""}`,
                  "métier couvertes par JUSTIA",
                ],
                ["100% Conformes", "RGPD, AI Act, Loi 09-08"],
              ].map(([value, desc], idx) => (
                <div key={value} className={`py-5 ${idx < 2 ? "border-b border-slate-200" : ""}`}>
                  <p className="text-3xl font-bold text-[#001A33]">{value}</p>
                  <p className="text-sm text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#00B2FF]">
                Casablanca · Paris · International
              </p>
              <h3 className="mt-3 font-['Playfair_Display'] text-3xl text-[#001A33] md:text-4xl">
                La technologie juridique au service de l'humain.
              </h3>
              <p className="mt-4 max-w-xl text-slate-600">
                JUSTIA conçoit des plateformes qui allient expertise juridique, IA et
                conformité pour fluidifier les opérations et renforcer la qualité des
                décisions au quotidien.
              </p>
              <div className="mt-6 rounded-2xl border-l-4 border-[#00D4AA] bg-[#001A33] p-5 text-white">
                <p className="text-sm font-semibold text-teal-200">JURIA — Assistant IA</p>
                <div className="mt-4 space-y-2">
                  <div className="w-3/4 rounded-lg bg-white/15 px-3 py-2 text-xs">Pouvez-vous résumer cette clause ?</div>
                  <div className="ml-auto w-2/3 rounded-lg bg-[#00D4AA]/35 px-3 py-2 text-xs">Résumé prêt avec citations.</div>
                  <div className="w-4/5 rounded-lg bg-white/15 px-3 py-2 text-xs">Exporter en PDF et partager ?</div>
                </div>
                <button className="mt-4 rounded-full bg-[#00D4AA] px-4 py-1.5 text-xs font-semibold text-[#001A33]">
                  Envoyer
                </button>
              </div>
            </div>
          </Container>
        </MotionSection>

        {/* SECTION: 7 DEMO SCREENSHOTS STRIP */}
        <MotionSection className="bg-slate-50">
          <Container>
            <div className="mb-8 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-['Playfair_Display'] text-3xl text-[#001A33] md:text-5xl">
                  Captures & Démos
                </h2>
                <p className="mt-2 text-slate-600">Aperçus des interfaces et cas d'usage.</p>
              </div>
              <div className="hidden gap-2 md:flex">
                <button onClick={() => goToScrollCard(demoScrollRef, Math.max(0, demoDot - 1))} className="rounded-full border border-slate-300 bg-white p-2">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button onClick={() => goToScrollCard(demoScrollRef, Math.min(demoMaxIdx, demoDot + 1))} className="rounded-full border border-slate-300 bg-white p-2">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div ref={demoScrollRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible" onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / Math.max(el.clientWidth * 0.88, 1));
              setDemoDot(Math.max(0, Math.min(idx, demoMaxIdx)));
            }}>
              {DEMO_CARDS_VISIBLE.map(([title, tag], idx) => (
                <article key={title} className="w-[88%] shrink-0 snap-center rounded-2xl bg-white p-4 shadow-md md:w-auto">
                  <div className={`h-40 rounded-xl p-3 ${idx === 0 ? "bg-gradient-to-r from-[#001A33] to-[#00B2FF]" : idx === 1 ? "bg-gradient-to-r from-slate-200 to-cyan-200" : idx === 2 ? "bg-gradient-to-r from-amber-200 to-yellow-100" : "bg-gradient-to-r from-violet-200 to-purple-100"}`}>
                    <div className="space-y-2">
                      <div className="h-2 w-2/3 rounded-full bg-white/60" />
                      <div className="h-2 w-1/2 rounded-full bg-white/60" />
                      <div className="h-16 rounded-lg bg-white/30" />
                    </div>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
                  <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{tag}</span>
                  <button className="mt-3 block text-sm font-semibold text-[#001A33]">Voir la démo →</button>
                </article>
              ))}
            </div>
            <div className="mt-4 flex justify-center gap-2 md:hidden">
              {DEMO_CARDS_VISIBLE.map((_, idx) => (
                <button key={idx} onClick={() => goToScrollCard(demoScrollRef, idx)} className={`h-2.5 rounded-full transition ${demoDot === idx ? "w-7 bg-[#00B2FF]" : "w-2.5 bg-slate-300"}`} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <button className="rounded-full border border-[#001A33] px-6 py-3 text-sm font-semibold text-[#001A33]">
                Voir plus de démos
              </button>
            </div>
          </Container>
        </MotionSection>

        {/* SECTION: 8 COMPARISON TABLE */}
        <MotionSection className="bg-white">
          <Container>
            <h2 className="font-['Playfair_Display'] text-3xl text-[#001A33] md:text-5xl">
              Comparatif rapide
            </h2>
            <p className="mt-2 text-slate-600">Optionnel — personnalisable selon vos besoins.</p>
            <div className="mt-8 overflow-x-auto rounded-2xl shadow-md">
              <table className="min-w-[760px] w-full">
                <thead className="bg-[#001A33] text-white">
                  <tr>
                    {["Produit", "Pour qui ?", "Modules inclus", "Essai gratuit", "Démo live"].map((header) => (
                      <th key={header} className="px-5 py-4 text-left text-sm font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS_VISIBLE.map((row, idx) => (
                    <tr key={row[0]} className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-cyan-50`}>
                      <td className="px-5 py-4 text-sm font-bold text-[#00B2FF]">{row[0]}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row[1]}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{row[2]}</td>
                      <td className={`px-5 py-4 text-center text-xl ${row[3] === "✅" ? "text-green-500" : "text-gray-300"}`}>{row[3]}</td>
                      <td className={`px-5 py-4 text-center text-xl ${row[4] === "✅" ? "text-green-500" : "text-gray-300"}`}>{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </MotionSection>

        {/* SECTION: 9 FAQ ACCORDION */}
        <MotionSection className="bg-white">
          <Container className="max-w-5xl">
            <h2 className="font-['Playfair_Display'] text-3xl text-[#001A33] md:text-5xl">
              {text.faqTitle}
            </h2>
            <p className="mt-2 text-slate-600">Intégrations, sécurité, interopérabilité.</p>
            <div className="mt-8">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className="border-b border-slate-200 py-3">
                    <button onClick={() => setOpenFaq(isOpen ? -1 : idx)} className={`flex w-full items-center justify-between py-2 text-left ${isOpen ? "border-l-4 border-[#00B2FF] pl-4" : ""}`}>
                      <span className={`text-base ${isOpen ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                        {item.q}
                      </span>
                      {isOpen ? <Minus className="h-4 w-4 text-slate-700" /> : <Plus className="h-4 w-4 text-slate-700" />}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p className="px-4 pb-2 text-sm text-slate-600">{item.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Container>
        </MotionSection>

        {/* SECTION: 10 FINAL CTA BANNER */}
        <section className="relative overflow-hidden bg-[#001A33] py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:18px_18px] opacity-20" />
          <Container className="relative text-center">
            <h2 className="mx-auto max-w-4xl font-['Playfair_Display'] text-4xl text-white md:text-[42px]">
              Une solution LegalTech adaptée à chaque métier du droit.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300">
              Demandez une démonstration ou contactez-nous pour une intégration sur mesure.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => handleCtaClick("Demander une démonstration", "demo")}
                className="rounded-full bg-[#00B2FF] px-8 py-4 text-sm font-semibold text-white"
              >
                Demander une démonstration
              </button>
              <button
                onClick={() => handleCtaClick("Nous contacter", "view")}
                className="rounded-full border border-white px-8 py-4 text-sm font-semibold text-white"
              >
                Nous contacter
              </button>
            </div>
          </Container>
        </section>
      </main>
      <Footer lang={currentLang} isDark={isDark} />

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#001A33] px-4 py-2 text-sm text-white shadow-xl"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}