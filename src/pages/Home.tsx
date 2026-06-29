import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  Lock,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useTheme } from "../hooks/useTheme";
import { colors } from "../config/colors";
import { isSolutionNameHidden } from "../config/solutionVisibility";
import PublicationCard from "./publications/components/PublicationCard";
import { listPublications } from "../services/publicationService";
import type { PublicationListItem } from "../types/publication";

const STRINGS = {
  fr: {
    hero: {
      title: "Trouvez Votre Conseil Juridique Ideal.",
      subtitle: "JUSTIA connecte entreprises et experts pour des decisions rapides, conformes et strategiques.",
      ctaPrimary: "Explorer nos services",
      ctaSecondary: "En savoir plus",
    },
    usp: {
      items: [
        { title: "Conformite RGPD", desc: "Assure une conformite legale complete." },
        { title: "Consultation Rapide", desc: "Reponse juridique le jour meme." },
        { title: "Multi-juridictionnel", desc: "France, Maroc et Union europeenne." },
      ],
    },
    solutions: {
      tabs: ["Conseil", "LegalTech", "Conformite"],
      cards: [
        { name: "JURE", desc: "Pilotage de dossiers et workflows cabinet.", badge: "IA-Powered", price: "A partir de 59 EUR/mois" },
        { name: "JURIA", desc: "Assistant legal IA pour recherche et redaction.", badge: "CNDP Compliant", price: "A partir de 39 EUR/mois" },
        { name: "LOCARIS", desc: "Gestion juridique immobiliere et due diligence.", badge: "Secure Cloud", price: "A partir de 49 EUR/mois" },
        { name: "COMPANIA", desc: "Conformite corporate et gouvernance multi-entites.", badge: "Audit Ready", price: "A partir de 69 EUR/mois" },
      ],
      cta: "Decouvrir",
    },
    guide: {
      title: "Guide pour premiers clients",
      steps: [
        { title: "Decrivez votre besoin juridique", desc: "Exposez votre contexte en moins de 3 minutes." },
        { title: "Choisissez votre domaine et urgence", desc: "Filtrez selon expertise, delai et budget." },
        { title: "Selectionnez un creneau de consultation", desc: "Planifiez en ligne avec confirmation immediate." },
        { title: "Recevez votre conseil et documents", desc: "Compte-rendu et livrables partages en espace securise." },
      ],
    },
    testimonials: {
      title: "Nos Clients Temoignent",
      cta: "Voir Plus",
      quote:
        "JUSTIA nous a permis d'accelerer nos validations contractuelles tout en restant pleinement conformes.",
      author: "Salma R.",
      role: "Head of Legal Operations",
    },
    stats: {
      items: [
        { value: "500+ Dossiers", label: "traites avec succes" },
        { value: "8x Plus Rapide", label: "qu'un cabinet traditionnel" },
        { value: "1 500+ Clients", label: "actifs sur la plateforme" },
      ],
      region: "Casablanca & Paris",
      title: "La Transformation Du Droit Par La Technologie.",
      desc: "Nous combinons expertise juridique et innovation digitale pour simplifier les parcours clients et accelerer la prise de decision.",
    },
    blog: {
      title: "Publications Juridiques",
      cards: [
        { title: "RGPD 2026: ce qui change", excerpt: "Les points de vigilance pour PME et groupes.", tag: "Conformite" },
        { title: "LegalOps: 5 automatismes utiles", excerpt: "Les flux qui reduisent vos cycles de validation.", tag: "LegalTech" },
        { title: "Contrats SaaS internationaux", excerpt: "Clauses critiques pour limiter les risques.", tag: "Contrats" },
        { title: "IA Act et gouvernance interne", excerpt: "Structurer un cadre responsable et auditable.", tag: "IA & Droit" },
      ],
      read: "Lire",
      viewAll: "Toutes les publications",
      loadError: "Impossible de charger les publications.",
    },
    services: {
      title: "Nos Services",
      cards: [
        { number: "01", title: "Conseil Juridique", desc: "Accompagnement strategic sur vos enjeux contractuels, societaires et contentieux." },
        { number: "02", title: "Solutions LegalTech", desc: "Automatisation des taches juridiques et pilotage de la performance." },
        { number: "03", title: "Formation & Compliance", desc: "Programmes operationnels pour equipes juridiques et metiers." },
      ],
    },
    footer: {
      about: "A propos",
      legal: "Mentions legales",
      rgpd: "RGPD",
      cookies: "Cookies",
      newsletterTitle: "Newsletter",
      newsletterDesc: "Recevez nos analyses et actualites.",
      emailPlaceholder: "Votre e-mail",
      subscribe: "S'abonner",
      rights: "Tous droits reserves",
    }
  },
  en: {
    hero: {
      title: "Find Your Ideal Legal Advisor.",
      subtitle: "JUSTIA helps teams get fast, compliant and business-driven legal support.",
      ctaPrimary: "Explore our services",
      ctaSecondary: "Learn more",
    },
    usp: {
      items: [
        { title: "GDPR Compliance", desc: "Ensures full legal compliance coverage." },
        { title: "Fast Consultation", desc: "Same-day legal response available." },
        { title: "Multi-jurisdiction", desc: "France, Morocco and EU expertise." },
      ],
    },
    solutions: {
      tabs: ["Advisory", "LegalTech", "Compliance"],
      cards: [
        { name: "JURE", desc: "Case workflows and legal operations for firms.", badge: "AI-Powered", price: "Starting at EUR 59/mo" },
        { name: "JURIA", desc: "AI legal assistant for research and drafting.", badge: "CNDP Compliant", price: "Starting at EUR 39/mo" },
        { name: "LOCARIS", desc: "Real estate legal handling and due diligence.", badge: "Secure Cloud", price: "Starting at EUR 49/mo" },
        { name: "COMPANIA", desc: "Corporate governance and compliance toolkit.", badge: "Audit Ready", price: "Starting at EUR 69/mo" },
      ],
      cta: "Discover",
    },
    guide: {
      title: "Guide for first clients",
      steps: [
        { title: "Describe your legal need", desc: "Share your context in under 3 minutes." },
        { title: "Choose practice area and urgency", desc: "Filter by expertise, timing and budget." },
        { title: "Select consultation slot", desc: "Schedule online with instant confirmation." },
        { title: "Receive advice and documents", desc: "Get recommendations and files securely." },
      ],
    },
    testimonials: {
      title: "What Our Clients Say",
      cta: "See More",
      quote: "JUSTIA helped us speed up contract approvals while keeping complete compliance confidence.",
      author: "Salma R.",
      role: "Head of Legal Operations",
    },
    stats: {
      items: [
        { value: "500+ Cases", label: "successfully handled" },
        { value: "8x Faster", label: "than traditional firms" },
        { value: "1,500+ Clients", label: "active on the platform" },
      ],
      region: "Casablanca & Paris",
      title: "Transforming Law Through Technology.",
      desc: "We combine legal expertise with digital innovation to simplify journeys and accelerate decision-making.",
    },
    blog: {
      title: "Legal Publications",
      cards: [
        { title: "GDPR 2026 updates", excerpt: "What legal and ops teams should prioritize now.", tag: "Compliance" },
        { title: "LegalOps automation playbook", excerpt: "Workflows that shorten legal review cycles.", tag: "LegalTech" },
        { title: "International SaaS contracts", excerpt: "Critical clauses to reduce risk exposure.", tag: "Contracts" },
        { title: "AI Act internal governance", excerpt: "How to build an auditable legal framework.", tag: "AI & Law" },
      ],
      read: "Read",
      viewAll: "All publications",
      loadError: "Could not load publications.",
    },
    services: {
      title: "Our Services",
      cards: [
        { number: "01", title: "Legal Advisory", desc: "Strategic support on contracts, corporate matters and disputes." },
        { number: "02", title: "LegalTech Solutions", desc: "Automation tools and performance visibility for legal teams." },
        { number: "03", title: "Training & Compliance", desc: "Operational programs for legal and business teams." },
      ],
    },
    footer: {
      about: "About",
      legal: "Legal Notice",
      rgpd: "GDPR",
      cookies: "Cookies",
      newsletterTitle: "Newsletter",
      newsletterDesc: "Monthly insights and updates.",
      emailPlaceholder: "Your email",
      subscribe: "Subscribe",
      rights: "All rights reserved",
    },
  },
  ar: {
    hero: {
      title: "اعثر على المستشار القانوني المثالي.",
      subtitle: "تساعد JUSTIA الفرق على الحصول على دعم قانوني سريع ومتوافق وعملي.",
      ctaPrimary: "استكشف خدماتنا",
      ctaSecondary: "اعرف المزيد",
    },
    usp: {
      items: [
        { title: "امتثال GDPR", desc: "يضمن تغطية قانونية كاملة." },
        { title: "استشارة سريعة", desc: "استجابة قانونية في نفس اليوم." },
        { title: "متعدد الاختصاصات", desc: "فرنسا والمغرب والاتحاد الاوروبي." },
      ],
    },
    solutions: {
      tabs: ["استشارة", "LegalTech", "امتثال"],
      cards: [
        { name: "JURE", desc: "ادارة القضايا وسير العمل القانوني.", badge: "AI-Powered", price: "ابتداء من 59 يورو/شهر" },
        { name: "JURIA", desc: "مساعد ذكي للبحث والصياغة القانونية.", badge: "CNDP Compliant", price: "ابتداء من 39 يورو/شهر" },
        { name: "LOCARIS", desc: "حلول قانونية للعقار والعناية الواجبة.", badge: "Secure Cloud", price: "ابتداء من 49 يورو/شهر" },
        { name: "COMPANIA", desc: "حوكمة الشركات والامتثال متعدد الكيانات.", badge: "Audit Ready", price: "ابتداء من 69 يورو/شهر" },
      ],
      cta: "اكتشف",
    },
    guide: {
      title: "دليل العملاء الجدد",
      steps: [
        { title: "صف حاجتك القانونية", desc: "شارك تفاصيلك خلال دقائق قليلة." },
        { title: "اختر المجال ودرجة الاستعجال", desc: "حدد التخصص والوقت والميزانية." },
        { title: "حدد موعد الاستشارة", desc: "احجز عبر المنصة بتاكيد فوري." },
        { title: "استلم الاستشارة والوثائق", desc: "نتائج ووثائق عبر مساحة امنة." },
      ],
    },
    testimonials: {
      title: "آراء عملائنا",
      cta: "عرض المزيد",
      quote: "ساعدتنا JUSTIA في تسريع الموافقات التعاقدية مع الحفاظ على الامتثال الكامل.",
      author: "سلمى ر.",
      role: "مديرة العمليات القانونية",
    },
    stats: {
      items: [
        { value: "500+ ملف", label: "تمت معالجته بنجاح" },
        { value: "8x اسرع", label: "من المكتب التقليدي" },
        { value: "1500+ عميل", label: "نشط على المنصة" },
      ],
      region: "الدار البيضاء وباريس",
      title: "تحويل القانون بالتكنولوجيا.",
      desc: "نجمع بين الخبرة القانونية والابتكار الرقمي لتبسيط رحلة العميل وتسريع القرارات.",
    },
    blog: {
      title: "منشورات قانونية",
      cards: [
        { title: "تحديثات GDPR 2026", excerpt: "اهم الاولويات للفرق القانونية والتشغيلية.", tag: "امتثال" },
        { title: "اتمتة العمليات القانونية", excerpt: "تدفقات عمل تقلل دورات المراجعة.", tag: "LegalTech" },
        { title: "عقود SaaS الدولية", excerpt: "بنود اساسية لتخفيض المخاطر.", tag: "عقود" },
        { title: "حوكمة الذكاء الاصطناعي", excerpt: "بناء اطار قانوني قابل للتدقيق.", tag: "الذكاء الاصطناعي" },
      ],
      read: "اقرا",
      viewAll: "كل المنشورات",
      loadError: "تعذر تحميل المنشورات.",
    },
    services: {
      title: "خدماتنا",
      cards: [
        { number: "01", title: "استشارة قانونية", desc: "دعم استراتيجي في العقود والشركات والنزاعات." },
        { number: "02", title: "حلول LegalTech", desc: "ادوات اتمتة وتحسين اداء الفرق القانونية." },
        { number: "03", title: "التدريب والامتثال", desc: "برامج عملية للفرق القانونية وفرق الاعمال." },
      ],
    },
    footer: {
      about: "من نحن",
      legal: "إشعار قانوني",
      rgpd: "GDPR",
      cookies: "الكوكيز",
      newsletterTitle: "النشرة البريدية",
      newsletterDesc: "مقالات وتحديثات شهرية.",
      emailPlaceholder: "بريدك الإلكتروني",
      subscribe: "اشترك",
      rights: "جميع الحقوق محفوظة",
    },
  },
} as const;

type Lang = keyof typeof STRINGS;
type HomeStrings = (typeof STRINGS)[Lang];

const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

const sectionTitle = "font-['Playfair_Display'] text-3xl md:text-5xl font-bold tracking-tight";
const bodyText = "font-['DM_Sans']";
const cardBase =
  "rounded-2xl shadow-md hover:shadow-xl transition-all duration-300";
const buttonBase =
  "inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-all";

const Section: React.FC<React.PropsWithChildren<{ className?: string; id?: string }>> = ({ children, className, id }) => (
  <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="px-3 md:px-5">
    <section
      id={id}
      className={`mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[var(--color-card-border)] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] backdrop-blur-xl ${className ?? ""}`}
    >
      {children}
    </section>
  </motion.div>
);

const Container: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${className ?? ""}`}>{children}</div>
);

const DotRow: React.FC<{ count: number; active: number; onClick: (idx: number) => void; isDark: boolean }> = ({ count, active, onClick, isDark }) => (
  <div className="mt-5 flex justify-center gap-2 md:hidden">
    {Array.from({ length: count }).map((_, idx) => (
      <button
        key={idx}
        onClick={() => onClick(idx)}
        className={`h-2.5 rounded-full transition-all ${idx === active ? (isDark ? "w-7 bg-[#00B2FF]" : "w-7 bg-[#001A33]") : (isDark ? "w-2.5 bg-[#00B2FF]/35" : "w-2.5 bg-[#001A33]/30")}`}
        aria-label={`Go to slide ${idx + 1}`}
      />
    ))}
  </div>
);

function HomeSectionHero({ t, isDark }: { t: HomeStrings; isDark: boolean }) {
  return (
    // SECTION: Hero
    <Section className={`relative min-h-[90vh] overflow-hidden ${isDark ? "bg-[#001A33]" : "bg-[#e9eeff]"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(0,178,255,0.28),transparent_45%),radial-gradient(circle_at_85%_25%,rgba(0,212,170,0.2),transparent_40%)]" />
      <Container className="relative grid min-h-[90vh] items-center gap-10 py-20 md:grid-cols-[1.2fr_0.8fr] md:py-28">
        <div className="space-y-7">
          <h1 className={`max-w-3xl text-4xl font-bold leading-[1.08] md:text-6xl ${isDark ? "text-white" : "text-[#0f172a]"} ${sectionTitle}`}>{t.hero.title}</h1>
          <p className={`max-w-2xl text-base md:text-lg ${isDark ? "text-white/80" : "text-slate-600"} ${bodyText}`}>{t.hero.subtitle}</p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/services"
              className={`${buttonBase} bg-[#00B2FF] text-[#001A33] hover:bg-[#00D4AA]`}
            >
              {t.hero.ctaPrimary}
            </Link>
            <a
              href="#solutions"
              className={`${buttonBase} ${isDark ? "border border-white/40 text-white hover:bg-white/10" : "border border-[#001A33]/25 text-[#001A33] hover:bg-[#001A33]/5"}`}
            >
              {t.hero.ctaSecondary}
            </a>
          </div>
        </div>
        <div className="relative hidden md:block">
          <div className="rounded-[28px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
            <div className="mb-4 grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className={`h-20 rounded-xl ${idx % 2 === 0 ? "bg-[#00B2FF]/30" : "bg-[#00D4AA]/25"}`} />
              ))}
            </div>
            <div className="rounded-2xl bg-[#00122a] p-4">
              <div className="mb-3 h-2 w-32 rounded-full bg-white/20" />
              <div className="mb-2 h-2 w-full rounded-full bg-white/10" />
              <div className="mb-2 h-2 w-4/5 rounded-full bg-white/10" />
              <div className="h-2 w-3/5 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

function HomeSectionUsp({ t, isDark }: { t: HomeStrings; isDark: boolean }) {
  const icons = [Lock, Timer, Globe];
  return (
    // SECTION: USP Pills
    <Section className={`${isDark ? "bg-[#071b30]" : "bg-slate-50"} py-20 md:py-28`}>
      <Container className="grid gap-5 md:grid-cols-3">
        {t.usp.items.map((item, idx) => {
          const Icon = icons[idx] ?? Sparkles;
          return (
            <article key={item.title} className={`${cardBase} rounded-xl p-6 ${isDark ? "border border-white/10 bg-[#10253d]" : "bg-white"}`}>
              <Icon className="mb-4 h-6 w-6 text-[#00B2FF]" />
              <h3 className={`text-xl ${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{item.title}</h3>
              <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"} ${bodyText}`}>{item.desc}</p>
            </article>
          );
        })}
      </Container>
    </Section>
  );
}

function HomeSectionSolutions({ t, isDark }: { t: HomeStrings; isDark: boolean }) {
  const [tab, setTab] = useState(0);
  const [activeDot, setActiveDot] = useState(0);
  const cards = useMemo(
    () => t.solutions.cards.filter((c) => !isSolutionNameHidden(c.name)),
    [t.solutions.cards],
  );
  const gridCols =
    cards.length >= 3 ? "md:grid-cols-3" : cards.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1";
  return (
    // SECTION: Solutions Browser
    <Section id="solutions" className={`${isDark ? "bg-[#0b223a]" : "bg-white"} py-20 md:py-28`}>
      <Container>
        <div className="mb-8 flex flex-wrap gap-3">
          {t.solutions.tabs.map((tabLabel, idx) => (
            <button
              key={tabLabel}
              onClick={() => setTab(idx)}
              className={`${buttonBase} px-5 py-2 text-sm ${
                tab === idx
                  ? isDark
                    ? "bg-[#00B2FF] text-[#001A33]"
                    : "bg-[#001A33] text-white"
                  : isDark
                    ? "bg-white/10 text-slate-200 hover:bg-white/15"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </div>
        <div
          className={`flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid ${gridCols} md:overflow-visible`}
          onScroll={(e) => {
            const el = e.currentTarget;
            const next = Math.round(el.scrollLeft / Math.max(el.clientWidth * 0.85, 1));
            setActiveDot(Math.max(0, Math.min(next, cards.length - 1)));
          }}
        >
          {cards.map((card) => (
            <article key={card.name} className={`${cardBase} min-w-[85%] snap-center border p-6 md:min-w-0 ${isDark ? "border-white/10 bg-[#10253d]" : "border-slate-200 bg-white"}`}>
              <h3 className={`text-2xl ${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{card.name}</h3>
              <p className={`mt-3 ${isDark ? "text-slate-300" : "text-slate-600"} ${bodyText}`}>{card.desc}</p>
              <span className={`mt-4 inline-block rounded-full bg-[#00B2FF]/15 px-3 py-1 text-xs font-semibold ${isDark ? "text-[#00B2FF]" : "text-[#001A33]"} ${bodyText}`}>{card.badge}</span>
              <p className={`mt-4 text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"} ${bodyText}`}>{card.price}</p>
              <Link
                to="/solutions"
                className={`${buttonBase} mt-5 bg-[#001A33] text-white hover:bg-[#003366]`}
              >
                {t.solutions.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
        <DotRow count={cards.length} active={activeDot} onClick={setActiveDot} isDark={isDark} />
      </Container>
    </Section>
  );
}

function HomeSectionGuide({ t, isDark }: { t: HomeStrings; isDark: boolean }) {
  return (
    // SECTION: User Guide
    <Section className={`${isDark ? "bg-[#071b30]" : "bg-slate-50"} py-20 md:py-28`}>
      <Container className="grid gap-12 md:grid-cols-2">
        <div className="relative">
          <span className="absolute -left-2 -top-12 text-8xl text-[#00B2FF] md:text-9xl">"</span>
          <h2 className={`max-w-md ${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{t.guide.title}</h2>
        </div>
        <ol className={`divide-y rounded-2xl border ${isDark ? "divide-white/10 border-white/10 bg-[#10253d]" : "divide-slate-200 border-slate-200 bg-white"}`}>
          {t.guide.steps.map((step, idx) => (
            <li key={step.title} className="p-5">
              <p className={`text-sm font-bold text-[#00B2FF] ${bodyText}`}>Step {idx + 1}</p>
              <h3 className={`mt-1 text-lg font-semibold ${isDark ? "text-white" : "text-[#001A33]"} ${bodyText}`}>{step.title}</h3>
              <p className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"} ${bodyText}`}>{step.desc}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

function HomeSectionTestimonials({ t, isDark }: { t: HomeStrings; isDark: boolean }) {
  const [slide, setSlide] = useState(0);
  const testimonials = [
    { quote: t.testimonials.quote, author: t.testimonials.author, role: t.testimonials.role },
    { quote: t.testimonials.quote, author: t.testimonials.author, role: t.testimonials.role },
    { quote: t.testimonials.quote, author: t.testimonials.author, role: t.testimonials.role },
  ];
  const current = testimonials[slide];
  const stacks = ["A", "B", "C"];
  return (
    // SECTION: Testimonials
    <Section className={`${isDark ? "bg-[#0b223a]" : "bg-white"} py-20 md:py-28`}>
      <Container>
        <h2 className={`${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{t.testimonials.title}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-[0.7fr_1.3fr]">
          <div className="relative min-h-[220px]">
            {stacks.map((label, idx) => (
              <div
                key={label}
                className={`absolute left-0 top-0 h-32 w-32 rounded-2xl p-4 shadow-md backdrop-blur ${isDark ? "bg-white/15" : "bg-slate-200/80"}`}
                style={{ transform: `translate(${idx * 28}px, ${idx * 22}px)`, filter: `blur(${idx}px)` }}
              />
            ))}
          </div>
          <article className={`${cardBase} border p-7 ${isDark ? "border-white/10 bg-[#10253d]" : "border-slate-200 bg-white"}`}>
            <div className="mb-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-[#001A33]" />
              <div>
                <p className={`font-semibold ${isDark ? "text-white" : "text-[#001A33]"} ${bodyText}`}>{current.author}</p>
                <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-500"} ${bodyText}`}>{current.role}</p>
              </div>
              <div className="ml-auto flex">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-[#00D4AA] text-[#00D4AA]" />
                ))}
              </div>
            </div>
            <p className={`text-lg ${isDark ? "text-slate-200" : "text-slate-700"} ${bodyText}`}>{current.quote}</p>
            <Link to="/consultation" className={`${buttonBase} mt-6 bg-black text-white`}>
              {t.testimonials.cta} <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="mt-4 flex gap-2 md:hidden">
              <button className={`rounded-full border p-2 ${isDark ? "border-white/20 text-white" : "border-slate-300"}`} onClick={() => setSlide((slide + testimonials.length - 1) % testimonials.length)}><ChevronLeft className="h-4 w-4" /></button>
              <button className={`rounded-full border p-2 ${isDark ? "border-white/20 text-white" : "border-slate-300"}`} onClick={() => setSlide((slide + 1) % testimonials.length)}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </article>
        </div>
      </Container>
    </Section>
  );
}

function HomeSectionStats({ t, isDark }: { t: HomeStrings; isDark: boolean }) {
  return (
    // SECTION: Stats + About
    <Section className={`${isDark ? "bg-[#071b30]" : "bg-slate-50"} py-20 md:py-28`}>
      <Container className="grid gap-7 md:grid-cols-2">
        <div className="space-y-4">
          {t.stats.items.map((item) => (
            <div key={item.value} className={`${cardBase} border p-5 ${isDark ? "border-white/10 bg-[#10253d]" : "border-slate-200 bg-white"}`}>
              <p className={`text-2xl ${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{item.value}</p>
              <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"} ${bodyText}`}>{item.label}</p>
            </div>
          ))}
        </div>
        <article className={`${cardBase} border p-7 ${isDark ? "border-white/10 bg-[#10253d]" : "border-slate-200 bg-white"}`}>
          <p className={`text-sm font-semibold uppercase tracking-wider text-[#00B2FF] ${bodyText}`}>{t.stats.region}</p>
          <h3 className={`mt-2 ${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{t.stats.title}</h3>
          <p className={`mt-3 max-w-lg ${isDark ? "text-slate-300" : "text-slate-600"} ${bodyText}`}>{t.stats.desc}</p>
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#001A33] to-[#003366] p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="h-14 rounded-lg bg-[#00B2FF]/30" />
              <div className="h-14 rounded-lg bg-[#00D4AA]/25" />
              <div className="h-14 rounded-lg bg-white/15" />
            </div>
          </div>
        </article>
      </Container>
    </Section>
  );
}

function HomeSectionBlog({ t, isDark, lang }: { t: HomeStrings; isDark: boolean; lang: Lang }) {
  const [apiItems, setApiItems] = useState<PublicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    void listPublications({
      page: 1,
      pageSize: 8,
      ordering: "-published_at",
      language: lang,
    })
      .then((res) => {
        if (!cancelled) setApiItems(res.items);
      })
      .catch(() => {
        if (!cancelled) {
          setApiItems([]);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const scrollByCards = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-home-pub-card]");
    const delta = (card?.offsetWidth ?? el.clientWidth * 0.82) + 16;
    el.scrollBy({ left: direction * delta, behavior: "smooth" });
  };

  const useLive = apiItems.length > 0;

  return (
    <Section id="publications" className={`${isDark ? "bg-[#0b223a]" : "bg-white"} py-20 md:py-28`}>
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={`${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{t.blog.title}</h2>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              to="/publications"
              className={`text-sm font-semibold underline-offset-4 hover:underline ${isDark ? "text-[#00B2FF]" : "text-[#001A33]"}`}
            >
              {t.blog.viewAll} →
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Précédent"
                className={`rounded-full border p-2 ${isDark ? "border-white/20 text-white hover:bg-white/10" : "border-slate-300 hover:bg-slate-50"}`}
                onClick={() => scrollByCards(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Suivant"
                className={`rounded-full border p-2 ${isDark ? "border-white/20 text-white hover:bg-white/10" : "border-slate-300 hover:bg-slate-50"}`}
                onClick={() => scrollByCards(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-12 flex justify-center py-16">
            <Loader2 className={`h-10 w-10 animate-spin ${isDark ? "text-[#00B2FF]" : "text-[#001A33]"}`} />
          </div>
        )}

        {!loading && useLive && (
          <div
            ref={scrollerRef}
            className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-4 md:overflow-visible"
          >
            {apiItems.slice(0, 8).map((pub) => (
              <div key={pub.id} data-home-pub-card className="min-w-[82%] snap-center md:min-w-0">
                <PublicationCard publication={pub} isDark={isDark} className="h-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && !useLive && (
          <>
            {loadFailed && (
              <p className={`mt-4 text-sm ${isDark ? "text-amber-200/90" : "text-amber-800"} ${bodyText}`}>{t.blog.loadError}</p>
            )}
            <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
              {t.blog.cards.map((post) => (
                <article
                  key={post.title}
                  className={`${cardBase} min-w-[82%] snap-center border p-4 md:min-w-0 ${isDark ? "border-white/10 bg-[#10253d]" : "border-slate-200 bg-white"}`}
                >
                  <div className="mb-4 h-32 rounded-xl bg-gradient-to-br from-[#00B2FF]/35 to-[#00D4AA]/25" />
                  <h3 className={`text-lg ${isDark ? "text-white" : "text-[#001A33]"} ${bodyText}`}>{post.title}</h3>
                  <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"} ${bodyText}`}>{post.excerpt}</p>
                  <span
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"} ${bodyText}`}
                  >
                    {post.tag}
                  </span>
                  <Link
                    to="/publications"
                    className={`${buttonBase} mt-4 ${isDark ? "border border-white/30 text-white hover:bg-white/10" : "border border-[#001A33] text-[#001A33] hover:bg-[#001A33] hover:text-white"}`}
                  >
                    {t.blog.read}
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </Container>
    </Section>
  );
}

function HomeSectionServices({ t, isDark }: { t: HomeStrings; isDark: boolean }) {
  return (
    // SECTION: Services Row
    <Section className={`${isDark ? "bg-[#071b30]" : "bg-slate-50"} py-20 md:py-28`}>
      <Container>
        <h2 className={`${isDark ? "text-white" : "text-[#001A33]"} ${sectionTitle}`}>{t.services.title}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {t.services.cards.map((service, idx) => (
            <article
              key={service.title}
              className={`${cardBase} p-6 ${
                idx === 0
                  ? "bg-[#001A33] text-white"
                  : isDark
                    ? "border border-white/10 bg-[#10253d] text-white"
                    : "border border-slate-200 bg-white text-[#001A33]"
              }`}
            >
              <p className={`text-xs font-bold tracking-[0.25em] ${bodyText}`}>{service.number}</p>
              <h3 className={`mt-3 text-2xl ${sectionTitle}`}>{service.title}</h3>
              <p className={`mt-3 text-sm ${idx === 0 ? "text-white/80" : isDark ? "text-slate-300" : "text-slate-600"} ${bodyText}`}>{service.desc}</p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("fr");
  const { isDark, setIsDark } = useTheme();
  const t = STRINGS[lang];

  return (
    <div
      className={`min-h-dvh ${bodyText}`}
      style={{ backgroundColor: isDark ? colors.primaryDark : colors.lightBg, color: isDark ? colors.textPrimary : colors.lightText }}
    >
      <Header lang={lang} setLang={setLang} isDark={isDark} setIsDark={setIsDark} />
      <main id="main" className="space-y-4 py-4 md:space-y-5 md:py-5">
        <HomeSectionHero t={t} isDark={isDark} />
        <HomeSectionUsp t={t} isDark={isDark} />
        <HomeSectionSolutions t={t} isDark={isDark} />
        <HomeSectionGuide t={t} isDark={isDark} />
        <HomeSectionTestimonials t={t} isDark={isDark} />
        <HomeSectionStats t={t} isDark={isDark} />
        <HomeSectionBlog t={t} isDark={isDark} lang={lang} />
        <HomeSectionServices t={t} isDark={isDark} />
      </main>
      <Footer footerStrings={t.footer} isDark={isDark} lang={lang} />
    </div>
  );
}