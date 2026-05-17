import { useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationDropdown } from "./NotificationDropdown";
import { useNotifications } from "@/hooks/useNotifications";

export interface NotificationBellProps {
  className?: string;
  /** If false, does not fetch on mount (you can call fetchList yourself). */
  fetchOnMount?: boolean;
}

export function NotificationBell({ className, fetchOnMount = true }: NotificationBellProps) {
  const { notifications, loading, unreadCount, fetchList, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (fetchOnMount) void fetchList({ pageSize: 20 });
  }, [fetchOnMount, fetchList]);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("relative text-slate-700 hover:text-slate-900", className)}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[100] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          sideOffset={8}
          align="end"
        >
          <NotificationDropdown
            items={notifications}
            loading={loading}
            onMarkRead={(id) => void markRead(id)}
            onMarkAllRead={() => void markAllRead()}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
