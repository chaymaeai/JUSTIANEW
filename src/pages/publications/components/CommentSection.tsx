import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicationComment } from "@/types/publication";
import { createPublicationComment, listPublicationComments } from "@/services/publicationService";
import { getApiErrorMessage } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CommentBlock({
  comment,
  isDark,
  depth,
  slug,
  onReplyPosted,
}: {
  comment: PublicationComment;
  isDark: boolean;
  depth: number;
  slug: string;
  onReplyPosted: () => Promise<void>;
}) {
  const { isAuthenticated, user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyErr, setReplyErr] = useState("");

  useEffect(() => {
    if (!user || !isAuthenticated) return;
    setAuthorName(`${user.firstName} ${user.lastName}`.trim());
    setAuthorEmail(user.email);
  }, [isAuthenticated, user]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    setReplyLoading(true);
    setReplyErr("");
    try {
      await createPublicationComment(slug, {
        authorName,
        authorEmail,
        content: replyBody,
        parent: comment.id,
      });
      setReplyBody("");
      setReplyOpen(false);
      await onReplyPosted();
    } catch (err) {
      setReplyErr(getApiErrorMessage(err, "Échec de l’envoi."));
    } finally {
      setReplyLoading(false);
    }
  }

  const inputCls = isDark ? "border-white/20 bg-[#10304f]/80 text-white placeholder:text-white/40" : "";
  const canReply = depth === 0;

  return (
    <div
      className={cn(
        "border-l-2 pl-4",
        depth === 0 ? "border-[#00B2FF]/40" : "border-white/15",
        depth > 0 ? "mt-4 ml-6" : ""
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            isDark ? "bg-[#00B2FF]/25 text-[#00B2FF]" : "bg-[#00B2FF]/15 text-[#001A33]"
          )}
          aria-hidden
        >
          {initials(comment.authorName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn("font-semibold", isDark ? "text-white" : "text-[#001A33]")}>{comment.authorName}</span>
            <time className={cn("text-xs", isDark ? "text-white/45" : "text-slate-500")} dateTime={comment.createdAt}>
              {format(new Date(comment.createdAt), "d MMM yyyy", { locale: fr })}
            </time>
          </div>
          <p className={cn("mt-2 whitespace-pre-wrap text-sm", isDark ? "text-white/75" : "text-slate-700")}>
            {comment.content}
          </p>
          {canReply ? (
            <button
              type="button"
              onClick={() => setReplyOpen((v) => !v)}
              className="mt-2 text-sm font-semibold text-[#00B2FF] hover:underline"
            >
              Répondre
            </button>
          ) : null}
        </div>
      </div>

      {replyOpen && canReply ? (
        <form onSubmit={handleReply} className={cn("mt-4 space-y-3 rounded-xl border p-4", isDark ? "border-white/15 bg-black/20" : "border-slate-200 bg-slate-50/80")}>
          {!isAuthenticated ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`reply-name-${comment.id}`} className={isDark ? "text-white/80" : ""}>
                  Nom
                </Label>
                <Input
                  id={`reply-name-${comment.id}`}
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className={cn("mt-1", inputCls)}
                />
              </div>
              <div>
                <Label htmlFor={`reply-email-${comment.id}`} className={isDark ? "text-white/80" : ""}>
                  E-mail
                </Label>
                <Input
                  id={`reply-email-${comment.id}`}
                  type="email"
                  required
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className={cn("mt-1", inputCls)}
                />
              </div>
            </div>
          ) : null}
          <div>
            <Label htmlFor={`reply-body-${comment.id}`} className={isDark ? "text-white/80" : ""}>
              Réponse
            </Label>
            <Textarea
              id={`reply-body-${comment.id}`}
              required
              rows={3}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              className={cn("mt-1 resize-y", inputCls)}
            />
          </div>
          {replyErr ? (
            <p className="text-sm text-red-500" role="alert">
              {replyErr}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={replyLoading} className="rounded-full bg-[#001A33] hover:bg-[#00B2FF]">
              {replyLoading ? "Envoi…" : "Soumettre"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setReplyOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : null}

      {comment.replies?.length ? (
        <div className="mt-3 space-y-2">
          {comment.replies.map((r) => (
            <CommentBlock key={r.id} comment={r} isDark={isDark} depth={depth + 1} slug={slug} onReplyPosted={onReplyPosted} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export interface CommentSectionProps {
  slug: string;
  initialComments?: PublicationComment[];
  initialCount?: number;
  isDark: boolean;
}

export default function CommentSection({ slug, initialComments = [], initialCount, isDark }: CommentSectionProps) {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<PublicationComment[]>(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!user || !isAuthenticated) return;
    setAuthorName(`${user.firstName} ${user.lastName}`.trim());
    setAuthorEmail(user.email);
  }, [isAuthenticated, user]);

  const visibleComments = useMemo(() => {
    function approvedOnly(list: PublicationComment[]): PublicationComment[] {
      return list
        .filter((c) => c.status === "approuve")
        .map((c) => ({
          ...c,
          replies: approvedOnly(c.replies ?? []),
        }));
    }
    return approvedOnly(comments);
  }, [comments]);

  const headerCount = visibleComments.length || initialCount || 0;

  async function refresh() {
    try {
      const next = await listPublicationComments(slug);
      setComments(next);
    } catch {
      /* keep existing */
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitState("loading");
    setErrorMsg("");
    try {
      await createPublicationComment(slug, { authorName, authorEmail, content });
      setSubmitState("done");
      if (!isAuthenticated) {
        setAuthorName("");
        setAuthorEmail("");
      }
      setContent("");
      await refresh();
    } catch (err) {
      setSubmitState("error");
      setErrorMsg(getApiErrorMessage(err, "Envoi impossible. Réessayez plus tard."));
    }
  }

  const inputCls = isDark ? "border-white/20 bg-[#10304f]/80 text-white placeholder:text-white/40" : "";

  return (
    <section className={cn("rounded-2xl border p-6 md:p-8", isDark ? "border-[#00B2FF]/25 bg-[#0b2441]/50" : "border-slate-200 bg-white/80")}>
      <div className="mb-6 flex items-center gap-2">
        <MessageCircle className={cn("h-5 w-5", isDark ? "text-[#00B2FF]" : "text-[#001A33]")} aria-hidden />
        <h2 className={cn("font-['DM_Sans'] text-xl font-bold", isDark ? "text-white" : "text-[#001A33]")}>
          Commentaires ({headerCount})
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-10 space-y-4">
        {!isAuthenticated ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="comment-name" className={isDark ? "text-white/80" : ""}>
                Nom
              </Label>
              <Input
                id="comment-name"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className={cn("mt-1.5", inputCls)}
              />
            </div>
            <div>
              <Label htmlFor="comment-email" className={isDark ? "text-white/80" : ""}>
                E-mail
              </Label>
              <Input
                id="comment-email"
                type="email"
                required
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                className={cn("mt-1.5", inputCls)}
              />
            </div>
          </div>
        ) : null}
        <div>
          <Label htmlFor="comment-body" className={isDark ? "text-white/80" : ""}>
            Commentaire
          </Label>
          <Textarea
            id="comment-body"
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Laissez un commentaire..."
            className={cn("mt-1.5 resize-y", inputCls)}
          />
        </div>
        <p className={cn("text-xs", isDark ? "text-white/45" : "text-slate-500")}>
          Votre commentaire sera modéré avant publication.
        </p>
        {submitState === "done" && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
            Merci. Votre message a bien été reçu.
          </p>
        )}
        {submitState === "error" && errorMsg && (
          <p className="text-sm text-red-500" role="alert">
            {errorMsg}
          </p>
        )}
        <Button type="submit" disabled={submitState === "loading"} className="rounded-full bg-[#001A33] hover:bg-[#00B2FF]">
          {submitState === "loading" ? "Envoi…" : "Soumettre"}
        </Button>
      </form>

      <div className="space-y-6">
        {visibleComments.length === 0 ? (
          <p className={cn("text-sm", isDark ? "text-white/55" : "text-slate-600")}>Soyez le premier à commenter.</p>
        ) : (
          visibleComments.map((c) => <CommentBlock key={c.id} comment={c} isDark={isDark} depth={0} slug={slug} onReplyPosted={refresh} />)
        )}
      </div>
    </section>
  );
}
