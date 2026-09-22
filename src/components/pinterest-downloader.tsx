import { useState } from "react";
import {
  Clipboard,
  Download,
  Loader2,
  Link as LinkIcon,
  Image,
  Video,
  Layers,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { resolveMedia, type ResolveResult } from "@/lib/resolve-media.functions";

const urlSchema = z
  .string()
  .trim()
  .url({ message: "Please paste a valid URL" })
  .refine((v) => /pinterest\.[a-z.]+|pin\.it/i.test(v), {
    message: "That doesn't look like a Pinterest link",
  });

type Resolved = Extract<ResolveResult, { ok: true }>;

function proxyUrl(mediaUrl: string, title: string | null) {
  const name = (title ?? "eagerbeaver").slice(0, 60);
  return `/api/public/media?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(name)}`;
}

function prettySize(bytes: number | null) {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function PinterestDownloader({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quality, setQuality] = useState<"720p" | "1080p" | "original">("original");
  const [result, setResult] = useState<Resolved | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const qc = useQueryClient();
  const runResolve = useServerFn(resolveMedia);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access blocked");
    }
  }

  async function saveHistory(media: Resolved, sourceUrl: string) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("downloads").insert({
      user_id: userData.user.id,
      source_url: sourceUrl,
      quality,
      status: "success",
      progress: 100,
      title: media.title,
      author_name: media.authorName,
      media_type: media.mediaType,
      media_url: media.mediaUrl,
      preview_url: media.previewUrl,
      thumbnail_url: media.previewUrl,
      width: media.width,
      height: media.height,
      duration_seconds: media.durationSeconds,
      file_size: media.fileSize,
    });
    qc.invalidateQueries({ queryKey: ["downloads"] });
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid URL");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await runResolve({ data: { url: parsed.data, quality } });
      if (!res.ok) {
        setErrorMsg(res.error);
        toast.error(res.error);
        return;
      }
      setResult(res);
      toast.success("Ready to download");
      void saveHistory(res, parsed.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={compact ? "" : "relative"}>
      <form onSubmit={submit} className="glass rounded-2xl p-2 md:p-3 shadow-elegant">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-background/60 px-4 py-3">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Pinterest link — pin, video, GIF…"
              className="flex-1 bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={paste}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              disabled={submitting}
            >
              <Clipboard className="h-3.5 w-3.5" />
              Paste
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting || !url}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {submitting ? "Fetching…" : "Download"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-2 pt-3 pb-1 text-xs text-muted-foreground">
          <span className="font-medium">Quality</span>
          {(["720p", "1080p", "original"] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              className={`rounded-full px-3 py-1 transition-colors ${
                quality === q
                  ? "bg-gradient-primary text-primary-foreground"
                  : "border border-border hover:bg-accent/60"
              }`}
            >
              {q}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1"><Image className="h-3 w-3" />Pins</span>
            <span className="flex items-center gap-1"><Video className="h-3 w-3" />Video</span>
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" />GIFs</span>
          </span>
        </div>
      </form>

      {submitting && (
        <div className="mt-6 glass rounded-2xl p-4 shadow-elegant animate-fade-up">
          <div className="flex gap-4">
            <div className="h-28 w-28 shrink-0 rounded-xl bg-muted/40 animate-pulse" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted/30 animate-pulse" />
              <div className="h-9 w-40 rounded-xl bg-muted/30 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {errorMsg && !submitting && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-left animate-fade-up">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Couldn't fetch that link</p>
            <p className="text-muted-foreground text-xs mt-1">{errorMsg}</p>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} aria-label="Dismiss">
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {result && !submitting && (
        <div className="mt-6 glass rounded-2xl p-4 md:p-5 shadow-elegant text-left animate-fade-up">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-48 shrink-0">
              {result.mediaType === "video" ? (
                <video
                  src={result.mediaUrl}
                  poster={result.previewUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-xl bg-black"
                />
              ) : (
                <img
                  src={result.previewUrl ?? result.mediaUrl}
                  alt={result.title ?? "Pinterest media"}
                  className="w-full rounded-xl object-cover"
                />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="font-medium line-clamp-2">{result.title ?? "Pinterest media"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[
                    result.authorName,
                    result.mediaType.toUpperCase(),
                    result.width && result.height ? `${result.width}×${result.height}` : null,
                    result.durationSeconds ? `${Math.round(result.durationSeconds)}s` : null,
                    prettySize(result.fileSize),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={proxyUrl(result.mediaUrl, result.title)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                >
                  <Download className="h-4 w-4" />
                  Download {result.mediaType === "video" ? "video" : "image"}
                </a>
                {result.previewUrl && result.previewUrl !== result.mediaUrl && (
                  <a
                    href={proxyUrl(result.previewUrl, `${result.title ?? "pin"}-thumb`)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent/60 transition-colors"
                  >
                    Thumbnail
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(result.mediaUrl);
                    toast.success("Direct link copied");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent/60 transition-colors"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Signed in? Every download is saved to your <span className="text-foreground font-medium">Downloads</span>.
      </p>
    </div>
  );
}
