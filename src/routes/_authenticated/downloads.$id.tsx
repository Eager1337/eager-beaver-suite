import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Sparkles, Loader2, ExternalLink, CheckCircle2, XCircle, Clock, Save } from "lucide-react";
import { toast } from "sonner";
import { trendingPins } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";
import { generateCaption, updateCaption } from "@/lib/ai-captions.functions";

export const Route = createFileRoute("/_authenticated/downloads/$id")({
  component: DownloadDetail,
});

function DownloadDetail() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const genFn = useServerFn(generateCaption);
  const saveFn = useServerFn(updateCaption);

  const { data: row, isLoading } = useQuery({
    queryKey: ["download", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("downloads").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (row?.ai_caption !== undefined) setCaption(row.ai_caption ?? "");
  }, [row?.ai_caption]);

  useEffect(() => {
    const channel = supabase
      .channel(`download-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "downloads", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["download", id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!row || row.user_id !== user.id) {
    return (
      <div className="max-w-xl mx-auto text-center p-10 glass rounded-2xl">
        <p className="text-sm text-muted-foreground">Download not found.</p>
        <Link to="/downloads" className="mt-4 inline-block text-sm text-primary">← Back to downloads</Link>
      </div>
    );
  }

  const swatch = trendingPins[Math.abs(hash(row.id)) % trendingPins.length].color;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { caption } = await genFn({ data: { downloadId: id } });
      setCaption(caption);
      toast.success("Caption generated");
      qc.invalidateQueries({ queryKey: ["download", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate caption");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveFn({ data: { downloadId: id, caption: caption.trim() } });
      toast.success("Caption saved");
      qc.invalidateQueries({ queryKey: ["download", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-up space-y-6">
      <button
        onClick={() => navigate({ to: "/downloads" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to downloads
      </button>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        <div
          className="aspect-square rounded-2xl shadow-elegant"
          style={{ background: `linear-gradient(160deg, ${swatch}, ${swatch}88)` }}
        />

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={row.status} />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold">{row.title || "Untitled pin"}</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {row.media_type?.toUpperCase()} • {row.quality || "original"}
              {row.file_size && <> • {(row.file_size / 1_000_000).toFixed(1)} MB</>}
            </div>
          </div>

          {(row.status === "queued" || row.status === "processing") && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{row.status === "queued" ? "Queued…" : "Downloading…"}</span>
                <span>{row.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-primary transition-all duration-300" style={{ width: `${row.progress}%` }} />
              </div>
            </div>
          )}

          {row.status === "error" && row.error_message && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {row.error_message}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={row.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-accent/60"
            >
              <ExternalLink className="h-3 w-3" /> Open on Pinterest
            </a>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI caption
            </h2>
            <p className="text-xs text-muted-foreground">Generate a caption, then edit it to fit your voice.</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {row.ai_caption ? "Regenerate" : "Generate"}
          </button>
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="No caption yet — click Generate."
          className="w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{caption.length} / 1000</span>
          <button
            onClick={handleSave}
            disabled={saving || caption === (row.ai_caption ?? "")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-accent/60 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        </div>
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

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
