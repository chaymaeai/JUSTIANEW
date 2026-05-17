import { useState, type FormEvent } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subscribeNewsletter } from "@/services/publicationService";
import { getApiErrorMessage } from "@/services/api";
import { cn } from "@/lib/utils";

export interface NewsletterBannerProps {
  isDark: boolean;
  langPref?: string;
  /** Compact card for sidebar; articleStrip = full-width dark band on article pages */
  variant?: "default" | "sidebar" | "articleStrip";
}

export default function NewsletterBanner({ isDark, langPref = "fr", variant = "default" }: NewsletterBannerProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      await subscribeNewsletter({ email, firstName: firstName || undefined, language: langPref });
      setStatus("success");
      setMessage(
        variant === "sidebar"
          ? "Merci ! Vérifiez votre e-mail."
          : variant === "articleStrip"
            ? "Merci ! Vérifiez votre boîte mail pour confirmer."
            : "Merci ! Vérifiez votre boîte mail pour confirmer votre inscription."
      );
      setEmail("");
      setFirstName("");
    } catch (err) {
      setStatus("error");
      setMessage(getApiErrorMessage(err, "Impossible de s’inscrire pour le moment."));
    }
  }

  if (variant === "articleStrip") {
    return (
      <section className="w-full bg-[#001A33] px-4 py-12 text-white sm:px-6 md:py-14">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-['DM_Sans'] text-xl font-bold tracking-tight md:text-2xl">
              Ne manquez aucune publication juridique.
            </h2>
            <p className="mt-3 text-sm text-white/70">
              <span aria-hidden>✓</span> Désabonnement en 1 clic · <span aria-hidden>✓</span> Zéro spam ·{" "}
              <span aria-hidden>✓</span> RGPD
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full min-w-0 flex-shrink-0 flex-col gap-3 sm:flex-row md:max-w-xl">
            <div className="min-w-0 flex-1">
              <Label htmlFor="article-newsletter-email" className="sr-only">
                E-mail
              </Label>
              <Input
                id="article-newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-white/25 bg-white/10 text-white placeholder:text-white/45 focus-visible:ring-[#00B2FF]"
                placeholder="Votre adresse e-mail"
              />
            </div>
            <Button
              type="submit"
              disabled={status === "loading"}
              className="h-12 shrink-0 rounded-full bg-[#00B2FF] px-8 font-semibold text-[#001A33] hover:bg-white"
            >
              {status === "loading" ? "…" : "S’abonner"}
            </Button>
          </form>
        </div>
        {message && (
          <p
            className={cn(
              "mx-auto mt-4 max-w-4xl text-center text-sm",
              status === "error" ? "text-red-300" : "text-emerald-300"
            )}
            role="status"
          >
            {message}
          </p>
        )}
      </section>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        className={cn(
          "rounded-2xl border p-4",
          isDark
            ? "border-[#00B2FF]/25 bg-gradient-to-br from-[#0d2844]/90 to-[#10304f]/80"
            : "border-[#00B2FF]/20 bg-gradient-to-br from-[#e8f7ff] to-[#e8edff]"
        )}
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="text-lg" aria-hidden>
            📧
          </span>
          <div>
            <h3 className={cn("font-['DM_Sans'] text-sm font-bold", isDark ? "text-white" : "text-[#001A33]")}>
              Restez informé
            </h3>
            <p className={cn("mt-0.5 text-xs leading-snug", isDark ? "text-white/65" : "text-slate-600")}>
              Recevez nos bulletins et analyses.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              "h-9 text-sm",
              isDark ? "border-white/20 bg-[#10304f]/80 text-white placeholder:text-white/40" : ""
            )}
            placeholder="Votre e-mail"
            aria-label="E-mail newsletter"
          />
          <Button
            type="submit"
            disabled={status === "loading"}
            className="h-9 w-full rounded-full bg-[#001A33] text-sm hover:bg-[#00B2FF]"
          >
            {status === "loading" ? "…" : "S’abonner"}
          </Button>
          {message && (
            <p
              className={cn("text-xs", status === "error" ? "text-red-500" : isDark ? "text-emerald-400" : "text-emerald-700")}
              role="status"
            >
              {message}
            </p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-3xl border px-6 py-10 md:px-10 md:py-12",
        isDark
          ? "border-[#00B2FF]/30 bg-gradient-to-r from-[#0d2844] to-[#10304f]"
          : "border-[#00B2FF]/25 bg-gradient-to-r from-[#e0f4ff] to-[#e8edff]"
      )}
    >
      <div className="mx-auto max-w-3xl text-center">
        <div
          className={cn(
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl",
            isDark ? "bg-[#00B2FF]/20 text-[#00B2FF]" : "bg-white text-[#001A33] shadow-sm"
          )}
        >
          <Mail className="h-6 w-6" aria-hidden />
        </div>
        <h2 className={cn("font-['DM_Sans'] text-2xl font-bold", isDark ? "text-white" : "text-[#001A33]")}>
          Restez informé des nouvelles publications
        </h2>
        <p className={cn("mt-2 text-sm", isDark ? "text-white/65" : "text-slate-600")}>
          Une fois par trimestre au plus : veille juridique, analyses et guides JUSTIA.
        </p>
        <form onSubmit={handleSubmit} className="mx-auto mt-8 grid max-w-lg gap-4 text-left sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="newsletter-email" className={isDark ? "text-white/80" : ""}>
              E-mail
            </Label>
            <Input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                "mt-1.5",
                isDark ? "border-white/20 bg-[#10304f]/80 text-white placeholder:text-white/40" : ""
              )}
              placeholder="vous@entreprise.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="newsletter-name" className={isDark ? "text-white/80" : ""}>
              Prénom (optionnel)
            </Label>
            <Input
              id="newsletter-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={cn(
                "mt-1.5",
                isDark ? "border-white/20 bg-[#10304f]/80 text-white placeholder:text-white/40" : ""
              )}
              placeholder="Camille"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col items-center gap-3">
            <Button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-full bg-[#001A33] hover:bg-[#00B2FF] sm:w-auto sm:px-10"
            >
              {status === "loading" ? "Envoi…" : "S’inscrire"}
            </Button>
            {message && (
              <p
                className={cn("text-sm", status === "error" ? "text-red-500" : isDark ? "text-emerald-400" : "text-emerald-700")}
                role="status"
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
