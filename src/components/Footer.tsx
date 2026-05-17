import React, { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FOOTER_STRINGS, FooterLang } from "../data/footerStrings";
import { subscribeNewsletter } from "../services/publicationService";
import { getApiErrorMessage } from "../services/api";

// ===== Types =====
type FooterStringsType = {
  about: string;
  legal: string;
  rgpd: string;
  cookies: string;
  newsletterTitle: string;
  newsletterDesc: string;
  emailPlaceholder: string;
  subscribe: string;
  rights: string;
};

interface FooterProps {
  footerStrings?: FooterStringsType | Readonly<FooterStringsType>;
  lang?: FooterLang;
  isDark: boolean;
}

// ===== Utilities =====
function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// ===== Reusable Components =====
const Container: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
  <div className={classNames("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>
);

// ===== Footer Component =====
const Footer: React.FC<FooterProps> = ({ footerStrings, lang = "fr", isDark }) => {
  const strings = footerStrings || FOOTER_STRINGS[lang];
  const logoSrc = isDark ? "/images/1x/Logo white.png" : "/images/1x/Logo dark.png";

  const columns = [
    {
      title: strings.about,
      links: [
        { label: "Services", to: "/services" },
        { label: "Solutions", to: "/solutions" },
        { label: "Consultation", to: "/consultation" },
        { label: "Publications", to: "/publications" },
      ],
    },
    {
      title: "Ressources",
      links: [
        { label: "Publications", to: "/publications" },
        { label: "Services", to: "/services" },
        { label: "Solutions", to: "/solutions" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Consultation", to: "/consultation" },
        { label: "Espace client", to: "/client-space/login" },
      ],
    },
    {
      title: strings.legal,
      links: [
        { label: strings.rgpd, to: "/publications" },
        { label: strings.cookies, to: "/" },
        { label: "Mentions légales", to: "/" },
      ],
    },
  ];

  const [newsEmail, setNewsEmail] = useState("");
  const [newsStatus, setNewsStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [newsMsg, setNewsMsg] = useState("");

  async function newsletterSubmit(e: FormEvent) {
    e.preventDefault();
    setNewsStatus("loading");
    setNewsMsg("");
    try {
      await subscribeNewsletter({ email: newsEmail, language: lang === "ar" ? "ar" : lang === "en" ? "en" : "fr" });
      setNewsStatus("ok");
      setNewsMsg("Merci ! Vérifiez votre e-mail pour confirmer.");
      setNewsEmail("");
    } catch (err) {
      setNewsStatus("err");
      setNewsMsg(getApiErrorMessage(err, "Inscription impossible pour le moment."));
    }
  }

  return (
    <footer className={`${isDark ? "bg-[#001A33]" : "bg-[#f3f4f6]"} py-16`}>
      <Container>
        <div
          className={`mx-auto max-w-6xl rounded-[2rem] border p-4 md:p-6 ${
            isDark
              ? "border-[#00B2FF]/30 bg-gradient-to-br from-[#091f3a] via-[#16314d] to-[#0d2e47]"
              : "border-white/70 bg-gradient-to-br from-[#dce4ff] via-[#e8edff] to-[#cef4ff]"
          } shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]`}
        >
          <div className="rounded-[1.75rem] p-8 md:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                className={`font-['Playfair_Display'] text-4xl font-bold leading-tight md:text-6xl ${
                  isDark ? "text-white" : "text-[#0f172a]"
                }`}
              >
                Ready to Take Control
                <br />
                of Your Health?
              </h2>
              <p className={`mt-4 font-['DM_Sans'] text-sm md:text-base ${isDark ? "text-white/75" : "text-slate-600"}`}>
                Get expert care for legal needs, compliance, and consultations from the comfort of your office.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to="/consultation"
                  className="rounded-full bg-[#1d4ed8] px-6 py-3 font-['DM_Sans'] text-sm font-semibold text-white shadow-md transition-all hover:bg-[#1e40af]"
                >
                  Démarrer
                </Link>
                <Link
                  to="/consultation"
                  className={`rounded-full border px-6 py-3 font-['DM_Sans'] text-sm font-semibold transition-all ${
                    isDark
                      ? "border-white/40 bg-white/10 text-white hover:bg-white/20"
                      : "border-slate-300 bg-white/80 text-slate-800 hover:bg-white"
                  }`}
                >
                  Nous contacter
                </Link>
              </div>
            </div>
          </div>

          <div
            className={`rounded-[1.4rem] border p-6 md:p-7 ${
              isDark ? "border-white/15 bg-white/5" : "border-white/80 bg-white/50"
            }`}
          >
            <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <img
                    src={logoSrc}
                    alt="Justia Logo"
                    className="h-10 w-auto object-contain"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo.png";
                    }}
                  />
                </div>
                <label className={`font-['DM_Sans'] text-sm font-medium ${isDark ? "text-white/85" : "text-slate-700"}`}>
                  Sign up to receive legal tips.
                </label>
                <form className="mt-3 flex max-w-sm flex-col gap-2 sm:flex-row sm:items-center" onSubmit={newsletterSubmit}>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={newsEmail}
                    onChange={(e) => setNewsEmail(e.target.value)}
                    placeholder={strings.emailPlaceholder}
                    className={`w-full rounded-full border px-4 py-2.5 font-['DM_Sans'] text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B2FF] ${
                      isDark
                        ? "border-white/25 bg-white/10 text-white placeholder:text-white/60"
                        : "border-slate-300 bg-white/90 text-slate-800 placeholder:text-slate-400"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={newsStatus === "loading"}
                    className="shrink-0 rounded-full bg-[#0f172a] px-5 py-2.5 font-['DM_Sans'] text-sm font-semibold text-white transition-all hover:bg-[#020617] disabled:opacity-60"
                  >
                    {newsStatus === "loading" ? "…" : strings.subscribe}
                  </button>
                </form>
                {newsMsg ? (
                  <p className={`mt-2 max-w-sm font-['DM_Sans'] text-xs ${newsStatus === "err" ? "text-red-400" : isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                    {newsMsg}
                  </p>
                ) : null}
                <p className={`mt-3 max-w-sm font-['DM_Sans'] text-xs ${isDark ? "text-white/65" : "text-slate-500"}`}>
                  By subscribing you agree to our Privacy Policy and receive updates from our company.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 font-['DM_Sans'] text-sm sm:grid-cols-4">
                {columns.map((col) => (
                  <div key={col.title}>
                    <p className={`mb-3 font-semibold ${isDark ? "text-white/90" : "text-slate-800"}`}>{col.title}</p>
                    <ul className="space-y-2">
                      {col.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            to={link.to}
                            className={`${isDark ? "text-white/65 hover:text-white" : "text-slate-600 hover:text-slate-900"} transition-colors`}
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className={`mt-7 border-t pt-5 text-center font-['DM_Sans'] text-xs ${isDark ? "border-white/20 text-white/65" : "border-slate-200 text-slate-500"}`}>
              © {new Date().getFullYear()} JUSTIA — {strings.rights}.
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;

