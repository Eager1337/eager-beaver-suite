import { useEffect, useState } from "react";
import { Bell, CheckCheck, CheckCircle2, XCircle, Info } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, type, link, read, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw new Error(error.message);
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification;
          if (n.type === "download_error") toast.error(n.title, { description: n.body ?? undefined });
          else toast.success(n.title, { description: n.body ?? undefined });
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  async function openItem(n: Notification) {
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    }
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card/40 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-gradient-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 glass rounded-2xl border border-border/60 shadow-elegant overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {items.length === 0 && (
                <li className="p-6 text-center text-xs text-muted-foreground">Nothing yet.</li>
              )}
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-accent/40 transition-colors ${n.read ? "" : "bg-primary/5"}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon type={n.type} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Icon({ type }: { type: string }) {
  if (type === "download_success") return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />;
  if (type === "download_error") return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
  return <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
}
