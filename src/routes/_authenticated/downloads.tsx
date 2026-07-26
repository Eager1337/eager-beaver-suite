import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, Trash2, ExternalLink, CheckCircle2, XCircle, Loader2, Clock, Eye } from "lucide-react";
import { trendingPins } from "@/lib/mock-data";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/downloads")({
  component: DownloadsPage,
});

type Row = {
  id: string;
  title: string | null;
  media_type: string;
  quality: string | null;
  source_url: string;
  status: string;
  progress: number;
  error_message: string | null;
  created_at: string;
};

function DownloadsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["downloads", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("downloads")
        .select("id, title, media_type, quality, source_url, status, progress, error_message, created_at")
        .order("created_at", { ascending: false });
      return (data ?? []) as Row[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`downloads-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "downloads", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["downloads", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, qc]);

  async function del(id: string) {
    const { error } = await supabase.from("downloads").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete");
    toast.success("Removed");
  }

  async function retry(id: string) {
    const { error } = await supabase
      .from("downloads")
      .update({ status: "queued", progress: 0, error_message: null })
      .eq("id", id);
    if (error) toast.error("Couldn't retry");
    else {
      toast.success("Re-queued");
      // simulate a new worker pass
      const { simulateRetry } = await import("@/lib/download-simulator");
      const row = rows.find((r) => r.id === id);
      if (row) void simulateRetry(id, row.media_type);
    }
  }

  const active = rows.filter((r) => r.status === "queued" || r.status === "processing");

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Downloads</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Live queue with real-time progress. {active.length > 0 && <span className="text-foreground">{active.length} in progress.</span>}
          </p>
        </div>
      </div>

      <div className="mt-8 glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center">
            <Download className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
            <p className="mt-4 text-sm text-muted-foreground">No downloads yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r, i) => (
              <li key={r.id} className="p-4 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div
                    className="h-14 w-14 rounded-lg shrink-0"
                    style={{
                      background: `linear-gradient(160deg, ${trendingPins[i % trendingPins.length].color}, ${trendingPins[i % trendingPins.length].color}88)`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">{r.title || "Untitled pin"}</div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {r.media_type?.toUpperCase()} • {r.quality || "original"} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </div>
                    {(r.status === "queued" || r.status === "processing") && (
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary transition-all duration-300"
                          style={{ width: `${r.progress}%` }}
                        />
                      </div>
                    )}
                    {r.status === "error" && r.error_message && (
                      <div className="mt-1.5 text-xs text-destructive">{r.error_message}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {r.status === "error" && (
                      <button
                        onClick={() => retry(r.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium border border-border hover:bg-background"
                      >
                        Retry
                      </button>
                    )}
                    <Link
                      to="/downloads/$id"
                      params={{ id: r.id }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background"
                      aria-label="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button onClick={() => del(r.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-background">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    queued: { label: "Queued", className: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
    processing: { label: "Processing", className: "bg-primary/15 text-primary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    success: { label: "Success", className: "bg-emerald-500/15 text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
    error: { label: "Failed", className: "bg-destructive/15 text-destructive", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[status] ?? map.queued;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.className}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
