import { useState } from "react";
import { Clipboard, Download, Loader2, Link as LinkIcon, Image, Video, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const urlSchema = z
  .string()
  .trim()
  .url({ message: "Please paste a valid URL" })
  .refine((v) => /pinterest\.[a-z.]+|pin\.it/i.test(v), {
    message: "That doesn't look like a Pinterest link",
  });

type Result = {
  title: string;
  media_type: "image" | "video" | "gif";
  quality: string;
  size: string;
  color: string;
};

const swatchColors = ["#c2410c", "#0f766e", "#7c2d12", "#1e3a8a", "#4c1d95", "#065f46"];

export function PinterestDownloader({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [quality, setQuality] = useState<"720p" | "1080p" | "original">("original");

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access blocked");
    }
  }

  async function download(e?: React.FormEvent) {
    e?.preventDefault();
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid URL");
      return;
    }
    setLoading(true);
    setProgress(0);
    setResult(null);

    // Simulated progress — real Pinterest API wires in Phase 2
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + Math.random() * 22, 95);
        return next;
      });
    }, 200);

    await new Promise((r) => setTimeout(r, 1600));
    clearInterval(timer);
    setProgress(100);

    const mediaTypes: Result["media_type"][] = ["image", "video", "gif"];
    const mt = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
    const mock: Result = {
      title: ["Studio moodboard", "Autumn palette", "Editorial layout", "Kyoto in fall"][
        Math.floor(Math.random() * 4)
      ],
      media_type: mt,
      quality,
      size: mt === "video" ? "12.4 MB" : "2.8 MB",
      color: swatchColors[Math.floor(Math.random() * swatchColors.length)],
    };
    setResult(mock);
    setLoading(false);

    // Save to history if signed in
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("downloads").insert({
        user_id: data.user.id,
        source_url: parsed.data,
        media_type: mock.media_type,
        title: mock.title,
        quality: mock.quality,
      });
    }
  }

  return (
    <div className={compact ? "" : "relative"}>
      <form
        onSubmit={download}
        className="glass rounded-2xl p-2 md:p-3 shadow-elegant"
      >
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl bg-background/60 px-4 py-3">
            <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Pinterest link — pin, board, video, GIF…"
              className="flex-1 bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground"
              disabled={loading}
            />
            <button
              type="button"
              onClick={paste}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              disabled={loading}
            >
              <Clipboard className="h-3.5 w-3.5" />
              Paste
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !url}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? "Working…" : "Download"}
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

      {loading && (
        <div className="mt-4 rounded-2xl glass p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Fetching media…</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="mt-4 rounded-2xl glass p-4 animate-fade-up">
          <div className="flex gap-4">
            <div
              className="h-24 w-24 rounded-xl shrink-0"
              style={{
                background: `linear-gradient(135deg, ${result.color}, ${result.color}aa)`,
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{result.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {result.media_type.toUpperCase()} • {result.quality} • {result.size}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-full bg-gradient-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow">
                  Save file
                </button>
                <button className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-accent/60">
                  Copy link
                </button>
                <button className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:bg-accent/60">
                  Add to favorites
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
