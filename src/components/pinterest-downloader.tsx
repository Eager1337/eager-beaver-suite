import { useState } from "react";
import { Clipboard, Download, Loader2, Link as LinkIcon, Image, Video, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

const urlSchema = z
  .string()
  .trim()
  .url({ message: "Please paste a valid URL" })
  .refine((v) => /pinterest\.[a-z.]+|pin\.it/i.test(v), {
    message: "That doesn't look like a Pinterest link",
  });

const swatchColors = ["#c2410c", "#0f766e", "#7c2d12", "#1e3a8a", "#4c1d95", "#065f46"];
const mediaTypes = ["image", "video", "gif"] as const;
const sampleTitles = ["Studio moodboard", "Autumn palette", "Editorial layout", "Kyoto in fall"];

export function PinterestDownloader({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quality, setQuality] = useState<"720p" | "1080p" | "original">("original");
  const qc = useQueryClient();

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access blocked");
    }
  }

  async function queueDownload(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid URL");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Sign in to queue downloads");
      return;
    }

    setSubmitting(true);
    const mt = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
    const title = sampleTitles[Math.floor(Math.random() * sampleTitles.length)];

    const { data: inserted, error } = await supabase
      .from("downloads")
      .insert({
        user_id: userData.user.id,
        source_url: parsed.data,
        media_type: mt,
        quality,
        title,
        status: "queued",
        progress: 0,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error || !inserted) {
      toast.error(error?.message ?? "Couldn't queue download");
      return;
    }

    setUrl("");
    toast.success("Queued — tracking progress");
    qc.invalidateQueries({ queryKey: ["downloads"] });

    // Simulated worker — flips through processing states.
    // Realtime subscribers on the downloads table pick up every update.
    void simulateWorker(inserted.id, mt);
  }

  return (
    <div className={compact ? "" : "relative"}>
      <form onSubmit={queueDownload} className="glass rounded-2xl p-2 md:p-3 shadow-elegant">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-background/60 px-4 py-3">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Pinterest link — pin, board, video, GIF…"
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
            {submitting ? "Queuing…" : "Download"}
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
            <span className="flex items-center gap-1"><Layers className="h-3 w-3" />Boards</span>
          </span>
        </div>
      </form>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Track progress live in your <span className="text-foreground font-medium">Downloads</span>.
      </p>
      <p className="text-center text-[10px] text-muted-foreground/70 mt-1">
        Suggested pick: <span style={{ color: swatchColors[0] }}>●</span> demo palette
      </p>
    </div>
  );
}

async function simulateWorker(id: string, mediaType: string) {
  // Small delay in queue
  await sleep(600);
  await supabase.from("downloads").update({ status: "processing", progress: 10 }).eq("id", id);

  // Simulated failure rate ~8%
  const willFail = Math.random() < 0.08;

  for (const step of [30, 55, 80, 95]) {
    await sleep(500 + Math.random() * 400);
    await supabase.from("downloads").update({ progress: step }).eq("id", id);
  }

  await sleep(400);
  if (willFail) {
    await supabase.from("downloads").update({
      status: "error",
      progress: 0,
      error_message: "Pinterest returned an unexpected response. Try again.",
    }).eq("id", id);
  } else {
    await supabase.from("downloads").update({
      status: "success",
      progress: 100,
      file_size: mediaType === "video" ? 12_400_000 : 2_800_000,
    }).eq("id", id);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
