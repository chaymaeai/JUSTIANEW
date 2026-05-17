import { CheckCircle2, Quote } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  activeTab: "login" | "register";
  title: string;
  subtitle: string;
  children: ReactNode;
}

const bullets = [
  "Suivez vos dossiers en temps reel",
  "Consultations securisees & tracables",
  "Documents juridiques centralises",
];

export default function AuthLayout({ activeTab, title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0A1628]">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-[45%] flex-col justify-between bg-gradient-hero p-10 text-white lg:flex">
          <div className="space-y-8">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/images/1x/Logo white.png" alt="JUSTIA" className="h-11 w-auto" />
              <div>
                <p className="text-xl font-semibold">JUSTIA</p>
                <p className="text-sm text-white/70">Votre partenaire juridique digital</p>
              </div>
            </Link>

            <ul className="space-y-4">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-lg">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-teal-300" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <blockquote className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm text-white/90">
            <Quote className="mb-3 h-5 w-5 text-teal-300" />
            "JUSTIA nous a permis de centraliser tous nos echanges juridiques et de suivre
            chaque dossier en toute confiance."
          </blockquote>
        </aside>

        <main className="flex w-full items-center justify-center bg-white px-6 py-10 dark:bg-[#0A1628] lg:w-[55%]">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-4">
              <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/70">
                <Link
                  to="/client-space/login"
                  className={`w-1/2 rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
                    activeTab === "login"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  Se connecter
                </Link>
                <Link
                  to="/client-space/register"
                  className={`w-1/2 rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
                    activeTab === "register"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 dark:text-slate-300"
                  }`}
                >
                  S'inscrire
                </Link>
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{title}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{subtitle}</p>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
