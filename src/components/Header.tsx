import React, { useState, useEffect } from "react";
import { Globe, Lock, Menu, X } from "lucide-react";

// ===== Types =====
type Lang = "fr" | "en" | "ar";

interface HeaderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

// ===== Navigation Strings =====
const NAV_STRINGS = {
  fr: {
    brand: "JUSTIA",
    nav: {
      home: "Accueil",
      services: "Services", 
      solutions: "Solutions",
      consult: "Consultation",
      publications: "Publications",
      about: "À propos",
      contact: "Contact",
      client: "Se connecter"
    }
  },
  en: {
    brand: "JUSTIA",
    nav: {
      home: "Home",
      services: "Services",
      solutions: "Solutions", 
      consult: "Consultation",
      publications: "Publications",
      about: "About",
      contact: "Contact",
      client: "Client Area"
    }
  },
  ar: {
    brand: "جوستيا",
    nav: {
      home: "الرئيسية",
      services: "الخدمات",
      solutions: "الحلول",
      consult: "الاستشارة", 
      publications: "المنشورات",
      about: "حول",
      contact: "اتصل",
      client: "تسجيل الدخول"
    }
  }
} as const;

// ===== Components =====
const Container: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className || ""}`}>{children}</div>
);

const Button: React.FC<{
  children: React.ReactNode;
  href?: string;
  variant?: "solid" | "ghost";
  ariaLabel?: string;
  className?: string;
  isDark?: boolean;
}> = ({ children, href, variant = "solid", ariaLabel, className, isDark = false }) => {
  const base = "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all";
  const solid = isDark 
    ? "bg-[#001A33] text-white hover:bg-[#00B2FF] shadow-lg shadow-[#001A33]/20" 
    : "bg-[#001A33] text-white hover:bg-[#002A4D] shadow-md";
  const ghost = isDark
    ? "border-2 border-[#00B2FF] text-[#00B2FF] hover:bg-[#00B2FF] hover:text-white"
    : "border-2 border-[#001A33] text-[#001A33] hover:bg-[#001A33] hover:text-white";
  
  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={`${base} ${variant === "solid" ? solid : ghost} ${className || ""}`}
      >
        {children}
      </a>
    );
  }
  
  return (
    <button
      aria-label={ariaLabel}
      className={`${base} ${variant === "solid" ? solid : ghost} ${className || ""}`}
    >
      {children}
    </button>
  );
};

const LangSelect: React.FC<{ lang: Lang; setLang: (l: Lang) => void; isDark: boolean }> = ({ lang, setLang, isDark }) => {
  return (
    <label className="inline-flex items-center gap-2 text-sm" aria-label="Language selector">
      <Globe className={`h-4 w-4 ${isDark ? 'text-[#00B2FF]' : 'text-[#001A33]'}`} aria-hidden />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className={`rounded-xl border px-3 py-2 focus:outline-none focus-visible:ring focus-visible:ring-[#00B2FF] ${isDark ? 'border-[#00B2FF] bg-[#003366]/50 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
      >
        <option value="fr" className={isDark ? 'bg-[#003366] text-white' : 'bg-white text-gray-900'}>FR</option>
        <option value="en" className={isDark ? 'bg-[#003366] text-white' : 'bg-white text-gray-900'}>EN</option>
        <option value="ar" className={isDark ? 'bg-[#003366] text-white' : 'bg-white text-gray-900'}>AR</option>
      </select>
    </label>
  );
};

const ThemeToggle: React.FC<{ isDark: boolean; setIsDark: (b: boolean) => void }> = ({ isDark, setIsDark }) => (
  <button
    type="button"
    aria-label="Toggle dark mode"
    className={`rounded-full p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF] focus-visible:ring-offset-2 transition-colors ${isDark ? 'text-[#00B2FF] hover:bg-[#00B2FF]/10' : 'text-gray-700 hover:bg-gray-100'}`}
    onClick={() => setIsDark(!isDark)}
  >
    <span className="sr-only">Theme</span>
    {isDark ? (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ) : (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    )}
  </button>
);

// ===== Main Header Component =====
const Header: React.FC<HeaderProps> = ({ lang, setLang, isDark, setIsDark }) => {
  const [open, setOpen] = useState(false);
  const navId = "primary-navigation";
  const t = NAV_STRINGS[lang];
  const logoSrc = isDark ? "/images/1x/Logo white.png" : "/images/1x/Logo dark.png";

  useEffect(() => {
    // Set HTML lang attribute based on language
    const htmlLang = lang === "fr" ? "fr" : lang === "en" ? "en" : "ar";
    const htmlDir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = htmlLang;
    document.documentElement.dir = htmlDir;
  }, [lang]);

  return (
    <header className="sticky top-0 z-40 bg-transparent px-3 pt-3 md:px-5 md:pt-5">
      <Container
        className={`rounded-[1.75rem] border px-4 py-3 shadow-[0_10px_28px_-18px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-colors md:px-6 md:py-4 ${
          isDark
            ? "border-[#00B2FF]/20 bg-gradient-to-r from-[#102b46]/80 via-[#173956]/80 to-[#14334e]/80"
            : "border-white/80 bg-gradient-to-r from-[#e0e6ff]/85 via-[#ebefff]/85 to-[#d8f4ff]/85"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Left: brand */}
          <a href="/" className="flex items-center transition-opacity hover:opacity-85" aria-label={t.brand}>
            <img
              src={logoSrc}
              alt="Justia Logo"
              className="h-10 w-auto object-contain md:h-11"
              onError={(event) => {
                event.currentTarget.src = "/images/logo.png";
              }}
            />
          </a>

          {/* Center: nav (desktop) */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-2 rounded-full border border-white/40 bg-white/45 px-3 py-2 font-['DM_Sans'] text-sm font-medium shadow-sm backdrop-blur md:gap-3">
              <li>
                <a className={`rounded-full px-3 py-2 transition-colors ${isDark ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-slate-700 hover:bg-white/80 hover:text-slate-900"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF]`} href="/">
                  {t.nav.home}
                </a>
              </li>
              <li>
                <a className={`rounded-full px-3 py-2 transition-colors ${isDark ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-slate-700 hover:bg-white/80 hover:text-slate-900"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF]`} href="/services">
                  {t.nav.services}
                </a>
              </li>
              <li>
                <a className={`rounded-full px-3 py-2 transition-colors ${isDark ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-slate-700 hover:bg-white/80 hover:text-slate-900"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF]`} href="/solutions">
                  {t.nav.solutions}
                </a>
              </li>
              <li>
                <a className={`rounded-full px-3 py-2 transition-colors ${isDark ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-slate-700 hover:bg-white/80 hover:text-slate-900"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF]`} href="/consultation">
                  {t.nav.consult}
                </a>
              </li>
              <li>
                <a className={`rounded-full px-3 py-2 transition-colors ${isDark ? "text-white/90 hover:bg-white/15 hover:text-white" : "text-slate-700 hover:bg-white/80 hover:text-slate-900"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF]`} href="/publications">
                  {t.nav.publications}
                </a>
              </li>
            </ul>
          </nav>

          {/* Right: actions */}
          <div className="hidden lg:flex items-center gap-2">
            <div className={`rounded-full border px-2 py-1 ${isDark ? "border-white/25 bg-white/10" : "border-white/80 bg-white/65"}`}>
              <LangSelect lang={lang} setLang={setLang} isDark={isDark} />
            </div>
            <div className={`rounded-full border p-0.5 ${isDark ? "border-white/25 bg-white/10" : "border-white/80 bg-white/65"}`}>
              <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
            </div>
            <Button href="/client-space/login" ariaLabel={t.nav.client} className="whitespace-nowrap rounded-full" isDark={isDark}>
              <Lock className="h-4 w-4" /> {t.nav.client}
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className={`lg:hidden inline-flex items-center justify-center rounded-full p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF] transition-colors ${
              isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"
            }`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-controls={navId}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile drawer */}
      {open && (
        <div
          id={navId}
          className={`mx-3 mt-2 rounded-3xl border p-2 backdrop-blur-xl md:mx-5 ${
            isDark
              ? "border-[#00B2FF]/25 bg-gradient-to-br from-[#0b2441]/95 via-[#10304f]/95 to-[#0e2b46]/95"
              : "border-white/80 bg-gradient-to-br from-[#e8edff]/95 to-[#d9f2ff]/95"
          } lg:hidden`}
        >
          <Container>
            <div className="flex flex-col gap-3 py-4" role="dialog" aria-modal="true" aria-label="Mobile menu">
              <div className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${isDark ? "border-white/15 bg-white/10" : "border-white/80 bg-white/65"}`}>
                <LangSelect lang={lang} setLang={setLang} isDark={isDark} />
                <ThemeToggle isDark={isDark} setIsDark={setIsDark} />
              </div>
              <a className={`rounded-xl px-3 py-3 font-medium transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"}`} href="/" onClick={() => setOpen(false)}>{t.nav.home}</a>
              <a className={`rounded-xl px-3 py-3 font-medium transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"}`} href="/services" onClick={() => setOpen(false)}>{t.nav.services}</a>
              <a className={`rounded-xl px-3 py-3 font-medium transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"}`} href="/solutions" onClick={() => setOpen(false)}>{t.nav.solutions}</a>
              <a className={`rounded-xl px-3 py-3 font-medium transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"}`} href="/consultation" onClick={() => setOpen(false)}>{t.nav.consult}</a>
              <a className={`rounded-xl px-3 py-3 font-medium transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"}`} href="/publications" onClick={() => setOpen(false)}>{t.nav.publications}</a>
              <a className={`rounded-xl px-3 py-3 font-medium transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"}`} href="#about" onClick={() => setOpen(false)}>{t.nav.about}</a>
              <a className={`rounded-xl px-3 py-3 font-medium transition-colors ${isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-white/70"}`} href="#contact" onClick={() => setOpen(false)}>{t.nav.contact}</a>
              <div className="pt-2">
                <Button href="/client-space/login" className="w-full justify-center" isDark={isDark}>
                  <Lock className="h-4 w-4" /> {t.nav.client}
                </Button>
              </div>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
};

export default Header;
