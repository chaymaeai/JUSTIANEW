import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Scale,
  Shield,
  Brain,
  Bookmark,
  Globe,
  Code2,
  FileText,
  Cpu,
  BarChart3,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTheme } from "../hooks/useTheme";

const STRINGS = {
  fr: {
    htmlLang: "fr",
    dir: "ltr" as const,
    heroTag: "Expertise Juridique & LegalTech",
    heroTitle:
      "Un accompagnement juridique et technologique, a la hauteur de vos enjeux.",
    heroSubtitle:
      "JUSTIA combine conseil juridique, innovation LegalTech et conformite pour accelerer vos decisions.",
  },
  en: {
    htmlLang: "en",
    dir: "ltr" as const,
    heroTag: "Legal Expertise & LegalTech",
    heroTitle:
      "Legal and technology support tailored to your strategic stakes.",
    heroSubtitle:
      "JUSTIA blends legal advisory, LegalTech products and compliance execution.",
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl" as const,
    heroTag: "الخبرة القانونية والتقنية",
    heroTitle: "مرافقة قانونية وتقنية بحجم تحدياتكم.",
    heroSubtitle:
      "تجمع JUSTIA بين الاستشارة القانونية وحلول LegalTech والامتثال التنظيمي.",
  },
} as const;

const Container = ({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

const Section = ({
  children,
  id,
  className = "",
}: React.PropsWithChildren<{ className?: string; id?: string }>) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.55, ease: "easeOut" }}
    className={`py-20 md:py-28 ${className}`}
  >
    {children}
  </motion.section>
);

const BTN =
  "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300";

const CTA = ({
  href = "#",
  children,
  className = "",
}: React.PropsWithChildren<{ href?: string; className?: string }>) => (
  <a href={href} className={`${BTN} ${className}`}>
    {children}
  </a>
);

const tabs = ["Tous", "Conseil Juridique", "LegalTech", "Publications", "Formations", "Conformite"];

const services = [
  { title: "Droit des affaires", desc: "Structuration, contrats commerciaux, contentieux strategiques.", badge: "SLA", category: "Conseil Juridique", color: "#001A33", icon: Scale },
  { title: "RGPD / Cybersecurite", desc: "Audit, DPO externalise, politiques de gouvernance et CNDP.", badge: "CNDP", category: "Conseil Juridique", color: "#00B2FF", icon: Shield },
  { title: "Droit de l'IA", desc: "Conformite AI Act, evaluation des risques et gouvernance des modeles.", badge: "AI Act", category: "Conseil Juridique", color: "#00D4AA", icon: Brain },
  { title: "Propriete intellectuelle", desc: "Protection des actifs numeriques, marques, licences et contrats.", badge: "IP", category: "Conseil Juridique", color: "#001A33", icon: Bookmark },
  { title: "Droit du numerique", desc: "CGU/CGV, contrats IT, cloud, API et e-commerce.", badge: "Conformite", category: "Conseil Juridique", color: "#00B2FF", icon: Globe },
  { title: "Plateformes juridiques", desc: "Portails clients, workflows et espaces collaboratifs securises.", badge: "IA-Powered", category: "LegalTech", color: "#00D4AA", icon: Code2 },
  { title: "Automatisation documentaire", desc: "Generation intelligente de contrats et clauses dynamiques.", badge: "SLA", category: "LegalTech", color: "#001A33", icon: FileText },
  { title: "IA d'analyse RAG", desc: "Recherche augmentee, syntheses juridiques et assistants metiers.", badge: "IA-Powered", category: "LegalTech", color: "#00B2FF", icon: Cpu },
  { title: "Tableaux de bord KPIs", desc: "Pilotage des risques, delais, dossiers et indicateurs d'impact.", badge: "KPI", category: "LegalTech", color: "#00D4AA", icon: BarChart3 },
];

const publications = [
  { title: "RGPD Update", tag: "Bulletin mensuel", excerpt: "Les evolutions reglementaires a surveiller ce mois-ci." },
  { title: "AI Act 2024", tag: "Analyse", excerpt: "Impacts operationnels et recommandations pour les directions." },
  { title: "Loi 09-08", tag: "Revue specialisee", excerpt: "Lecture pratique des obligations pour entreprises marocaines." },
  { title: "Droit numerique", tag: "Newsletter", excerpt: "Veille hebdomadaire sur contrats, cyber et plateformes." },
];

const faqItems = [
  {
    q: "Comment se deroule une consultation ?",
    a: "Un echange de 30 a 45 min pour cadrer votre besoin, evaluer les risques et proposer une feuille de route.",
  },
  {
    q: "Combien de temps dure un audit RGPD ?",
    a: "Selon la taille et la complexite : de 2 a 6 semaines, avec priorisation des actions critiques.",
  },
  {
    q: "Proposez-vous des demos de vos solutions ?",
    a: "Oui. Nous preparons une demonstration ciblee en fonction de vos cas d'usage.",
  },
  {
    q: "Peut-on payer en ligne ?",
    a: "Oui, avec paiement securise et options d'abonnement selon les services.",
  },
];

export default function ServicesPage({ lang = "fr" as "fr" | "en" | "ar" }) {
  const [currentLang, setCurrentLang] = useState<"fr" | "en" | "ar">(lang);
  const [activeTab, setActiveTab] = useState<string>("Tous");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activePub, setActivePub] = useState(0);
  const [mobileServiceIndex, setMobileServiceIndex] = useState(0);
  const mobileServiceRef = useRef<HTMLDivElement | null>(null);
  const { isDark, setIsDark } = useTheme();

  const L = useMemo(() => {
    return STRINGS[lang] ?? STRINGS.fr;
  }, [lang]);

  const filteredServices = useMemo(
    () => (activeTab === "Tous" ? services : services.filter((s) => s.category === activeTab)),
    [activeTab]
  );

  const handleMobileServicesScroll = () => {
    if (!mobileServiceRef.current) return;
    const { scrollLeft, clientWidth } = mobileServiceRef.current;
    const idx = Math.round(scrollLeft / Math.max(clientWidth * 0.86, 1));
    setMobileServiceIndex(Math.max(0, Math.min(idx, filteredServices.length - 1)));
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#001A33] text-white" : "bg-white text-slate-900"}`}>
      <Header
        lang={currentLang}
        setLang={setCurrentLang}
        isDark={isDark}
        setIsDark={setIsDark}
      />
      <main
        lang={L.htmlLang}
        dir={L.dir}
        style={
          {
            ["--brand" as string]: "#001A33",
            ["--brand-2" as string]: "#00B2FF",
            ["--brand-accent" as string]: "#00D4AA",
          } as React.CSSProperties
        }
        className={`font-['DM_Sans'] ${isDark ? "bg-[#001A33]" : "bg-white"}`}
      >
        {/* SECTION: 1 HERO */}
        <section className="relative min-h-[80vh] overflow-hidden bg-[#001A33] py-24">
          <Container className="grid items-center gap-12 md:grid-cols-12">
            <motion.div
              className="md:col-span-7"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-cyan-200">
                {L.heroTag}
              </span>
              <h1 className="mt-6 font-['Playfair_Display'] text-4xl font-bold leading-tight text-white md:text-6xl">
                {L.heroTitle}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200">{L.heroSubtitle}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <CTA href="#consultation" className="bg-[#00B2FF] text-[#001A33] hover:shadow-xl">
                  Planifier une consultation gratuite
                </CTA>
                <CTA href="#services" className="border border-white text-white hover:bg-white/10">
                  Decouvrir nos solutions
                </CTA>
              </div>
            </motion.div>
            <div className="relative hidden min-h-[460px] md:col-span-5 md:block">
              {[
                { title: "Conseil Juridique", sub: "Droit des affaires", cls: "top-6 left-2 rotate-[-6deg]" },
                { title: "AI Act Compliance", sub: "Gouvernance IA", cls: "top-36 left-14 rotate-[4deg]" },
                { title: "LegalTech", sub: "JURE · JURIA", cls: "top-64 left-8 rotate-[-2deg]" },
              ].map((card, idx) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 40, rotate: -2 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.12, duration: 0.45 }}
                  className={`absolute w-[280px] rounded-2xl border border-white/20 bg-white/10 p-5 text-white backdrop-blur ${card.cls}`}
                >
                  <div className="mb-3 inline-flex rounded-xl bg-[#00B2FF]/20 p-2">
                    <Sparkles className="h-5 w-5 text-[#00B2FF]" />
                  </div>
                  <p className="font-semibold">{card.title}</p>
                  <p className="text-sm text-slate-200">{card.sub}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>

        {/* SECTION: 2 USP PILLS */}
        <Section className="bg-white">
          <Container>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[
                ["🔒", "Conformite RGPD & CNDP", "Mise en conformite complete"],
                ["⚡", "Reactivite SLA garantie", "Intervention rapide et tracable"],
                ["🌍", "Multi-juridictionnel", "France · Maroc · Union Europeenne"],
              ].map(([icon, title, desc]) => (
                <div key={title} className="rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <p className="text-2xl">{icon}</p>
                  <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* SECTION: 3 SERVICES FILTER + GRID */}
        <Section id="services" className="bg-slate-50">
          <Container>
            <div className="mb-8 flex flex-wrap gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMobileServiceIndex(0);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab ? "bg-[#001A33] text-white" : "bg-white text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="hidden grid-cols-1 gap-6 sm:grid-cols-2 lg:grid lg:grid-cols-3">
              {filteredServices.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl"
                  style={{ borderTop: `4px solid ${item.color}` }}
                >
                  <div className="mb-4 inline-flex rounded-xl bg-slate-50 p-2">
                    <item.icon className="h-5 w-5 text-[#001A33]" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.desc}</p>
                  <span className="mt-4 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {item.badge}
                  </span>
                  <div className="mt-5">
                    <CTA
                      className={`${
                        item.category === "LegalTech"
                          ? "border border-[#001A33] text-[#001A33]"
                          : "bg-[#001A33] text-white"
                      }`}
                    >
                      {item.category === "LegalTech" ? "Demander une demo" : "Parler a un expert"}
                    </CTA>
                  </div>
                </article>
              ))}
            </div>

            <div
              ref={mobileServiceRef}
              onScroll={handleMobileServicesScroll}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:hidden"
            >
              {filteredServices.map((item) => (
                <article
                  key={item.title}
                  className="w-[86%] shrink-0 snap-center rounded-2xl border border-slate-100 bg-white p-6 shadow-md"
                  style={{ borderTop: `4px solid ${item.color}` }}
                >
                  <div className="mb-4 inline-flex rounded-xl bg-slate-50 p-2">
                    <item.icon className="h-5 w-5 text-[#001A33]" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </article>
              ))}
            </div>
            <div className="mt-4 flex justify-center gap-2 lg:hidden">
              {filteredServices.map((_, i) => (
                <span
                  key={`dot-${i}`}
                  className={`h-2 w-2 rounded-full ${i === mobileServiceIndex ? "bg-[#00B2FF]" : "bg-slate-300"}`}
                />
              ))}
            </div>
          </Container>
        </Section>

        {/* SECTION: 4 HOW IT WORKS */}
        <Section>
          <Container className="grid gap-10 lg:grid-cols-2">
            <div>
              <p className="text-7xl text-[#00B2FF]">"</p>
              <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#001A33] md:text-5xl">
                Comment ca fonctionne ?
              </h2>
            </div>
            <div>
              {[
                ["1", "Exprimez votre besoin", "Decrivez votre situation juridique ou projet."],
                ["2", "Choisissez votre domaine", "Droit des affaires, IA, RGPD, propriete intellectuelle..."],
                ["3", "Planifiez une consultation", "Creneau en ligne, visio ou presentiel, sous 24h."],
                ["4", "Recevez conseil & documents", "Livrables, contrats, analyses ou feuille de route."],
              ].map(([n, title, desc]) => (
                <div key={n} className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
                  <p className="text-lg font-bold text-[#00B2FF]">{n}</p>
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="text-sm text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* SECTION: 5 TESTIMONIALS */}
        <Section className="bg-[#F9FAFB]">
          <Container>
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[#001A33] md:text-5xl">
              Ce que disent nos clients
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-12">
              <div className="relative hidden md:col-span-4 md:block">
                <div className="absolute top-0 left-4 h-28 w-48 rounded-2xl bg-white shadow-sm blur-[1px]" />
                <div className="absolute top-10 left-12 h-28 w-48 rounded-2xl bg-white shadow-sm blur-[1px]" />
                <div className="absolute top-20 left-2 h-28 w-48 rounded-2xl bg-white shadow-sm blur-[1px]" />
              </div>
              <div className="md:col-span-8">
                <div className="rounded-2xl bg-white p-8 shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#001A33] text-sm font-bold text-white">
                      NA
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Nadia Ait Lahcen</p>
                      <p className="text-sm text-slate-500">CEO, FinData Group</p>
                    </div>
                    <p className="ml-auto text-yellow-500">★★★★★</p>
                  </div>
                  <p className="mt-5 text-slate-700">
                    JUSTIA nous a permis de structurer notre conformite RGPD en 3 semaines, avec un DPO externalise et des livrables clairs.
                  </p>
                </div>
                <CTA className="mt-5 bg-[#001A33] text-white">Voir plus de temoignages →</CTA>
              </div>
            </div>
          </Container>
        </Section>

        {/* SECTION: 6 STATS + POSITIONING */}
        <Section>
          <Container className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-5">
              {[
                ["500+ Dossiers", "traites avec succes"],
                ["8x Plus Rapide", "qu'un cabinet traditionnel"],
                ["1 500+ Clients", "actifs sur la plateforme"],
              ].map(([value, text]) => (
                <div key={value} className="border-b border-slate-100 pb-5">
                  <p className="text-3xl font-bold text-[#001A33]">{value}</p>
                  <p className="text-sm text-slate-600">{text}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#00B2FF] uppercase">Casablanca · Paris · UE</p>
              <h3 className="mt-3 font-['Playfair_Display'] text-3xl font-bold text-[#001A33]">
                La transformation du droit par la technologie.
              </h3>
              <p className="mt-4 text-slate-600">
                JUSTIA developpe une pratique juridique augmentee : plus rapide, mesurable et orientee execution pour les entreprises ambitieuses.
              </p>
              <div className="mt-6 rounded-2xl border-l-4 border-[#00D4AA] bg-[#001A33] p-6 text-white">
                <Scale className="mb-3 h-7 w-7 text-[#00D4AA]" />
                Mission LegalTech orientee impact business.
              </div>
            </div>
          </Container>
        </Section>

        {/* SECTION: 7 PUBLICATIONS / VEILLE */}
        <Section className="bg-slate-50">
          <Container>
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[#001A33] md:text-5xl">
                Edition & Veille Juridique
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setActivePub((p) => Math.max(0, p - 1))}
                  className="rounded-full border border-slate-200 bg-white p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setActivePub((p) => Math.min(publications.length - 1, p + 1))}
                  className="rounded-full border border-slate-200 bg-white p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="hidden grid-cols-1 gap-6 sm:grid-cols-2 lg:grid lg:grid-cols-4">
              {publications.map((post) => (
                <article key={post.title} className="rounded-2xl bg-white p-5 shadow-md">
                  <div className="h-[120px] rounded-xl bg-gradient-to-r from-[#001A33] via-[#00B2FF] to-[#00D4AA]" />
                  <h3 className="mt-4 font-semibold text-slate-900">{post.title}</h3>
                  <span className="mt-2 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                    {post.tag}
                  </span>
                  <p className="mt-3 text-sm text-slate-600">{post.excerpt}</p>
                  <button className="mt-4 text-sm font-semibold text-[#001A33]">Lire →</button>
                </article>
              ))}
            </div>
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:hidden">
              {publications.map((post, idx) => (
                <article
                  key={post.title}
                  className={`w-[86%] shrink-0 snap-center rounded-2xl bg-white p-5 shadow-md ${
                    idx === activePub ? "ring-2 ring-[#00B2FF]/30" : ""
                  }`}
                >
                  <div className="h-[120px] rounded-xl bg-gradient-to-r from-[#001A33] via-[#00B2FF] to-[#00D4AA]" />
                  <h3 className="mt-4 font-semibold text-slate-900">{post.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{post.excerpt}</p>
                </article>
              ))}
            </div>
          </Container>
        </Section>

        {/* SECTION: 8 TRAINING SERVICES ROW */}
        <Section>
          <Container>
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[#001A33] md:text-5xl">
              Formations & Webinaires
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              <article className="rounded-2xl bg-[#001A33] p-6 text-white shadow-md">
                <p className="text-sm">01</p>
                <h3 className="mt-2 text-xl font-semibold">RGPD avance & DPO</h3>
                <p className="mt-2 text-sm text-slate-200">8h - presentiel/visio</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                <p className="text-sm">02</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">AI Act pratique</h3>
                <p className="mt-2 text-sm text-slate-600">6h - cas d'usage & checklists</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                <p className="text-sm">03</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">Cybersecurite pour juristes</h3>
                <p className="mt-2 text-sm text-slate-600">6h - menaces & politiques</p>
              </article>
            </div>
            <article className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              Legal Design & contrats - 4h
            </article>
            <div className="mt-8 flex flex-wrap gap-4">
              <CTA className="bg-[#001A33] text-white">Voir le catalogue</CTA>
              <CTA className="border border-[#001A33] text-[#001A33]">S'inscrire</CTA>
            </div>
          </Container>
        </Section>

        {/* SECTION: 9 STRATEGIC COMPLIANCE BLOCK */}
        <Section className="bg-[#001A33] text-white">
          <Container className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-['Playfair_Display'] text-3xl font-bold md:text-5xl">
                Conseil strategique & conformite
              </h2>
              <p className="mt-4 text-slate-200">
                Transformez votre conformite en avantage concurrentiel durable.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "Audit & diagnostic reglementaire",
                  "Conseil juridique de direction (externalise)",
                  "Chartes ethiques & codes de conduite",
                  "Mise en conformite AI Act / RGPD / Loi 09-08",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#00D4AA]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <CTA className="mt-8 bg-[#00B2FF] text-[#001A33]">Demander un audit</CTA>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
              <p className="text-lg font-semibold">Feuille de route</p>
              <div className="mt-6 space-y-4">
                {[
                  ["AI Act", "70%"],
                  ["RGPD", "85%"],
                  ["Loi 09-08", "55%"],
                ].map(([label, width]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs text-slate-300">
                      <span>{label}</span>
                      <span>{width}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/20">
                      <div className="h-2 rounded-full bg-[#00D4AA]" style={{ width }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                {["AI Act", "RGPD", "Loi 09-08"].map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Container>
        </Section>

        {/* SECTION: 10 FAQ ACCORDION */}
        <Section>
          <Container>
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-[#001A33] md:text-5xl">
              Questions frequentes
            </h2>
            <div className="mt-10 space-y-2">
              {faqItems.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className={`border-b border-slate-100 py-3 ${isOpen ? "border-l-4 border-l-[#00B2FF] pl-4" : ""}`}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className={`text-base ${isOpen ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                        {item.q}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-sm text-slate-600">{item.a}</p>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </Container>
        </Section>

        {/* SECTION: 11 FINAL CTA */}
        <section className="relative overflow-hidden bg-[#001A33] py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,178,255,0.18),_transparent_55%)]" />
          <Container className="relative text-center">
            <h2 className="mx-auto max-w-4xl font-['Playfair_Display'] text-4xl font-bold text-white md:text-5xl">
              Pret a transformer votre securite juridique en avantage strategique ?
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <CTA className="bg-[#00B2FF] text-[#001A33]">
                <CalendarDays className="mr-2 h-4 w-4" />
                Planifier une consultation gratuite
              </CTA>
              <CTA className="border border-white text-white">Se connecter</CTA>
            </div>
          </Container>
        </section>
      </main>
      <Footer lang={currentLang} isDark={isDark} />
    </div>
  );
}
