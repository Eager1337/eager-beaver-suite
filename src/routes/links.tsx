import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Link2, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { resolveSocial } from "@/lib/social.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/links")({
  validateSearch: (s: Record<string, unknown>) => ({ url: typeof s.url === "string" ? s.url : undefined }),
  head: () => ({
    meta: [
      { title: "Video link generator — EagerBeaver" },
      { name: "description", content: "Turn any YouTube, TikTok, Instagram or web video into a short playable EagerBeaver link." },
      { property: "og:title", content: "Video link generator — EagerBeaver" },
      { property: "og:description", content: "Paste a video link, get a short playable link to share." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LinksPage,
});

type Made = { code: string; title: string | null; created_at: string };

function LinksPage() {
  const search = Route.useSearch();
  const [url, setUrl] = useState(search.url ?? "");
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Made[]>([]);
  const resolve = useServerFn(resolveSocial);

  useEffect(() => {
    try { setMade(JSON.parse(localStorage.getItem("eb-links") ?? "[]")); } catch { /* empty */ }
  }, []);

  const share = (code: string) => `${window.location.origin}/v/${code}`;

  async function make(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().url().startsWith("https://").safeParse(url.trim());
    if (!parsed.success) return toast.error("Paste a full link starting with https://");
    setBusy(true);
    try {
      const r = await resolve({ data: { url: parsed.data } });
      if (!r.ok) { toast.error(r.error); return; }
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("video_links")
        .insert({ video_url: parsed.data, title: r.title.slice(0, 200), poster_url: r.cover, source: r.platform, created_by: u.user?.id ?? null })
        .select("code, title, created_at")
        .single();
      if (error || !data) { toast.error("Couldn't create the link. Try again."); return; }
      const next = [data, ...made].slice(0, 30);
      setMade(next);
      localStorage.setItem("eb-links", JSON.stringify(next));
      await navigator.clipboard.writeText(share(data.code)).catch(() => {});
      toast.success("Link created and copied");
      setUrl("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-center">
          Video <span className="text-gradient">link generator</span>
        </h1>
        <p className="mt-3 text-center text-muted-foreground">
          Paste a YouTube, TikTok, Instagram or any video link and get a short link that plays on EagerBeaver.
        </p>
        <form onSubmit={make} className="mt-8 glass rounded-2xl p-2 flex gap-2 shadow-elegant">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…"
            className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground" />
          <button disabled={busy || !url.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Generate
          </button>
        </form>

        {made.length > 0 && (
          <div className="mt-10 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Your links</h2>
            {made.map((m) => (
              <div key={m.code} className="glass rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{m.title ?? "Video"}</p>
                  <p className="truncate text-xs text-muted-foreground">/v/{m.code}</p>
                </div>
                <Link to="/v/$code" params={{ code: m.code }} className="rounded-lg border border-border p-2 hover:bg-accent/60" aria-label="Play"><Play className="h-4 w-4" /></Link>
                <button onClick={() => { navigator.clipboard.writeText(share(m.code)); toast.success("Copied"); }}
                  className="rounded-lg border border-border p-2 hover:bg-accent/60" aria-label="Copy link"><Copy className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
