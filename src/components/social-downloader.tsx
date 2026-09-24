import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Youtube, Instagram } from "lucide-react";
import { toast } from "sonner";
import { resolveSocial, type SocialResult } from "@/lib/social.functions";

type Ok = Extract<SocialResult, { ok: true }>;

export function SocialMode() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Ok | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = useServerFn(resolveSocial);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await run({ data: { url: url.trim() } });
      if (r.ok) setRes(r);
      else setErr(r.error);
    } catch {
      setErr("Please paste a valid YouTube or Instagram link.");
    }
    setBusy(false);
  }

  return (
    <>
      <form onSubmit={go} className="glass rounded-2xl p-2 flex gap-2 shadow-elegant">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube or Instagram link"
          className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          disabled={busy || !url.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />} Fetch
        </button>
      </form>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Instagram className="h-3.5 w-3.5" /> Instagram support is coming soon.
      </p>
      {err && <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-left">{err}</div>}
      {res && (
        <div className="mt-6 glass rounded-2xl p-4 text-left space-y-3 animate-fade-up">
          <div className="aspect-video overflow-hidden rounded-xl">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${res.videoId}`}
              title={res.title}
              allowFullScreen
            />
          </div>
          <div>
            <p className="font-medium">{res.title}</p>
            <p className="text-xs text-muted-foreground">{res.author}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {res.thumbs.map((t) => (
              <a
                key={t.label}
                href={`/api/public/media?url=${encodeURIComponent(t.url)}&filename=${encodeURIComponent(res.title.slice(0, 60))}`}
                onClick={() => toast.success("Cover image downloading")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs hover:bg-accent/60"
              >
                <Download className="h-3.5 w-3.5" /> {t.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Full video (MP4) saving from YouTube needs a download partner service — covers work today.
          </p>
        </div>
      )}
    </>
  );
}
