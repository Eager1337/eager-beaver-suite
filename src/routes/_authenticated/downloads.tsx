import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Download, Trash2, ExternalLink } from "lucide-react";
import { trendingPins } from "@/lib/mock-data";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/downloads")({
  component: DownloadsPage,
});

function DownloadsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["downloads-all", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("downloads").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function del(id: string) {
    const { error } = await supabase.from("downloads").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete");
    qc.invalidateQueries({ queryKey: ["downloads-all", user.id] });
    qc.invalidateQueries({ queryKey: ["downloads", user.id] });
    toast.success("Removed");
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-up">
      <h1 className="font-display text-3xl font-semibold">Downloads</h1>
      <p className="mt-1 text-muted-foreground text-sm">Your complete download history.</p>

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
              <li key={r.id} className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors">
                <div
                  className="h-14 w-14 rounded-lg shrink-0"
                  style={{
                    background: `linear-gradient(160deg, ${trendingPins[i % trendingPins.length].color}, ${trendingPins[i % trendingPins.length].color}88)`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.title || "Untitled pin"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.media_type?.toUpperCase()} • {r.quality || "original"} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </div>
                </div>
                <a href={r.source_url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button onClick={() => del(r.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-background">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
