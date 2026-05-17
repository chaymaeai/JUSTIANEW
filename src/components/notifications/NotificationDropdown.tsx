import { Link } from "react-router-dom";
import { BellOff, CheckCheck } from "lucide-react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import type { NotificationItem } from "@/types/api";
import { formatRelativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NotificationDropdownProps {
  items: NotificationItem[];
  loading?: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
  className?: string;
}

function NotificationRow({
  n,
  onMarkRead,
}: {
  n: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  const body = (
    <>
      <p className="font-medium text-slate-900">{n.title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.body}</p>
      <p className="mt-1 text-[11px] text-slate-400">{formatRelativeTime(n.createdAt)}</p>
    </>
  );
  const rowClass = cn(
    "block w-full rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-50",
    !n.read && "bg-cyan-50/50"
  );

  if (n.href) {
    return (
      <Link to={n.href} className={rowClass} onClick={() => !n.read && onMarkRead(n.id)}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={rowClass}
      onClick={() => {
        if (!n.read) onMarkRead(n.id);
      }}
    >
      {body}
    </button>
  );
}

export function NotificationDropdown({
  items,
  loading,
  onMarkRead,
  onMarkAllRead,
  className,
}: NotificationDropdownProps) {
  const hasUnread = items.some((n) => !n.read);

  return (
    <div className={cn("flex w-[min(100vw-2rem,22rem)] flex-col rounded-xl border border-slate-200 bg-white shadow-xl", className)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">Notifications</p>
        {onMarkAllRead && hasUnread && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-cyan-700 hover:text-cyan-900"
            onClick={() => onMarkAllRead()}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout lu
          </Button>
        )}
      </div>
      <ScrollArea.Root className="max-h-80" type="auto">
        <ScrollArea.Viewport className="max-h-80 p-1">
          {loading && <p className="px-3 py-6 text-center text-sm text-slate-500">Chargement…</p>}
          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
              <BellOff className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-600">Aucune notification</p>
            </div>
          )}
          {!loading && items.map((n) => (
            <div key={n.id} className="mb-0.5">
              <NotificationRow n={n} onMarkRead={onMarkRead} />
            </div>
          ))}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex touch-none select-none bg-slate-100 p-0.5 transition-colors hover:bg-slate-200"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-slate-400" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
