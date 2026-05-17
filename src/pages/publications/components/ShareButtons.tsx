import { useCallback, useState } from "react";
import { Check, Download, Facebook, Link2, Linkedin, Share2, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShareButtonsProps {
  title: string;
  description?: string;
  url?: string;
  isDark: boolean;
  className?: string;
  /** LinkedIn, X, copy + optional PDF — omit Facebook when false */
  includeFacebook?: boolean;
  pdfHref?: string | null;
  showShareLabel?: boolean;
}

function buildUrl(path: string, params: Record<string, string>) {
  const u = new URL(path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.toString();
}

export default function ShareButtons({
  title,
  description,
  url,
  isDark,
  className,
  includeFacebook = true,
  pdfHref,
  showShareLabel = true,
}: ShareButtonsProps) {
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  const links = [
    {
      label: "LinkedIn",
      href: buildUrl("https://www.linkedin.com/sharing/share-offsite/", { url: shareUrl }),
      Icon: Linkedin,
    },
    {
      label: "X (Twitter)",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      Icon: Twitter,
    },
    ...(includeFacebook
      ? [
          {
            label: "Facebook",
            href: buildUrl("https://www.facebook.com/sharer/sharer.php", { u: shareUrl }),
            Icon: Facebook,
          },
        ]
      : []),
  ];

  const baseBtn = cn(
    "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
    isDark
      ? "border-white/20 text-white/85 hover:border-[#00B2FF] hover:bg-[#00B2FF]/15 hover:text-[#00B2FF]"
      : "border-slate-200 text-slate-700 hover:border-[#00B2FF] hover:text-[#00B2FF]"
  );

  const wideBtn = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
    isDark
      ? "border-white/20 text-white/85 hover:border-[#00B2FF] hover:bg-[#00B2FF]/15 hover:text-[#00B2FF]"
      : "border-slate-200 text-slate-700 hover:border-[#00B2FF] hover:text-[#00B2FF]"
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {showShareLabel ? (
        <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold", isDark ? "text-white/70" : "text-slate-600")}>
          <Share2 className="h-4 w-4" aria-hidden />
          Partager
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {links.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Partager sur ${label}`}
            className={baseBtn}
            title={label}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </a>
        ))}
        <button type="button" onClick={onCopy} aria-label="Copier le lien" className={wideBtn} title="Copier le lien">
          {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">Copier le lien</span>
        </button>
        {pdfHref ? (
          <a href={pdfHref} target="_blank" rel="noopener noreferrer" className={wideBtn}>
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            <span>Télécharger PDF</span>
          </a>
        ) : null}
      </div>
      {description ? (
        <span className="sr-only" id="share-desc">
          {description}
        </span>
      ) : null}
    </div>
  );
}
