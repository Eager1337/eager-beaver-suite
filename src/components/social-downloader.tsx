import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Globe, Link2 } from "lucide-react";
import { toast } from "sonner";
import { resolveSocial, type SocialResult } from "@/lib/social.functions";
import { supabase } from "@/integrations/supabase/client";

type Ok = Extract<SocialResult, { ok: true }>;

export const proxied = (url: string, title: string, inline = false) =>
  `/api/public/media?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(title.slice(0, 60))}${inline ? "&inline=1" : ""}`;

export function SocialMode() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Ok | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = useServerFn(resolveSocial);
  const qc = useQueryClient();

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
      setErr("Please paste a full link starting with https://");
    }
    setBusy(false);
  }

  async function save(v: Ok["variants"][number]) {
    if (!res) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("downloads").insert({
      user_id: data.user.id,
      source_url: url.trim(),
      quality: v.label,
      status: "success",
      progress: 100,
      title: res.title,
      author_name: res.author,
      media_type: v.kind === "image" ? "image" : "video",
      media_url: v.url,
      preview_url: res.cover,
      thumbnail_url: res.cover,
    });
    qc.invalidateQueries({ queryKey: ["downloads"] });
    toast.success("Saved to your Downloads");
  }

  const firstVideo = res?.variants.find((v) => v.kind === "video");

  return (
    <>
      <form onSubmit={go} className="glass rounded-2xl p-2 flex gap-2 shadow-elegant">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube, TikTok, Instagram or any video link"
          className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          disabled={busy || !url.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />} Fetch
        </button>
      </form>
      {err && <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-left">{err}</div>}
      {res && (
        <div className="mt-6 glass rounded-2xl p-4 text-left space-y-3 animate-fade-up">
          <div className="overflow-hidden rounded-xl bg-muted">
            {firstVideo ? (
              <video src={proxied(firstVideo.url, res.title, true)} poster={res.cover ?? undefined} controls playsInline className="max-h-[480px] w-full" />
            ) : res.embedUrl ? (
              <iframe className="aspect-video w-full" src={res.embedUrl} title={res.title} allowFullScreen />
            ) : res.cover ? (
              <img src={res.cover} alt={res.title} className="w-full" />
            ) : null}
          </div>
          <div>
            <p className="font-medium line-clamp-2">{res.title}</p>
            {res.author && <p className="text-xs text-muted-foreground">{res.author} · {res.platform}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {res.variants.map((v) => (
              <a
                key={v.url + v.label}
                href={proxied(v.url, res.title)}
                onClick={() => { toast.success("Download started"); void save(v); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs hover:bg-accent/60"
              >
                <Download className="h-3.5 w-3.5" /> {v.label}
              </a>
            ))}
            <a href={`/links?url=${encodeURIComponent(url.trim())}`} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs hover:bg-accent/60">
              <Link2 className="h-3.5 w-3.5" /> Make share link
            </a>
          </div>
          {res.note && <p className="text-xs text-muted-foreground">{res.note}</p>}
        </div>
      )}
    </>
  );
}
