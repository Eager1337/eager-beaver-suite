import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Sparkles, Loader2, ExternalLink, CheckCircle2, XCircle, Clock, Save, History, Download as DownloadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { generateCaption, updateCaption } from "@/lib/ai-captions.functions";
import { MediaPreview } from "@/components/media-preview";

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

  const { data: versions = [] } = useQuery({
    queryKey: ["caption-versions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caption_versions")
        .select("id, caption, source, created_at")
        .eq("download_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { caption: next } = await genFn({ data: { downloadId: id } });
      setCaption(next);
      toast.success("Caption regenerated");
      qc.invalidateQueries({ queryKey: ["download", id] });
      qc.invalidateQueries({ queryKey: ["caption-versions", id] });
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
      qc.invalidateQueries({ queryKey: ["caption-versions", id] });
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

      <div className="grid md:grid-cols-[320px_1fr] gap-6">
        <MediaPreview
          mediaType={row.media_type}
          mediaUrl={row.media_url}
          previewUrl={row.preview_url ?? row.thumbnail_url}
          title={row.title}
          status={row.status}
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
              {row.width && row.height ? <> • {row.width}×{row.height}</> : null}
              {row.duration_seconds ? <> • {Math.round(Number(row.duration_seconds))}s</> : null}
              {row.file_size ? <> • {(row.file_size / 1_000_000).toFixed(1)} MB</> : null}
            </div>
            {row.author_name && (
              <div className="mt-1 text-xs text-muted-foreground">by {row.author_name}</div>
            )}
          </div>

          {(row.status === "queued" || row.status === "processing") && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{row.status === "queued" ? "Queued…" : "Fetching from Pinterest…"}</span>
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
            {row.media_url && row.status === "success" && (
              <a
                href={row.media_url}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
              >
                <DownloadIcon className="h-3 w-3" /> Save file
              </a>
            )}
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
        <div className="flex items-center justify-between gap-3">
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
            {row.ai_caption ? "Regenerate caption" : "Generate caption"}
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent/60"
            >
              <History className="h-3 w-3" /> Versions ({versions.length})
            </button>
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

        {showHistory && (
          <ul className="space-y-2 pt-2 border-t border-border/60">
            {versions.length === 0 && (
              <li className="text-xs text-muted-foreground py-2">No versions logged yet.</li>
            )}
            {versions.map((v) => (
              <li key={v.id} className="rounded-xl bg-background/50 p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>{v.source === "ai" ? "AI generated" : "Edited"}</span>
                  <span>{formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}</span>
                </div>
                <p className="mt-1 text-xs whitespace-pre-wrap">{v.caption}</p>
                <button
                  onClick={() => setCaption(v.caption)}
                  className="mt-2 text-[11px] font-medium text-primary hover:underline"
                >
                  Restore this version
                </button>
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
