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
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/links")({
  validateSearch: (s: Record<string, unknown>): { url?: string } => (typeof s.url === "string" ? { url: s.url } : {}),
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
  const [latest, setLatest] = useState<string | null>(null);
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
      setLatest(data.code);
      localStorage.setItem("eb-links", JSON.stringify(next));
      await navigator.clipboard.writeText(share(data.code)).catch(() => {});
      toast.success("Link created and copied");
      setUrl("");
    } catch {
      toast.error("Couldn't create the link. Try again.");
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
           <Button disabled={busy || !url.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Generate
           </Button>
        </form>

         {latest && (
           <div className="mt-6 border border-border bg-card p-4 text-sm" role="status">
             <p className="font-semibold">Your public video link is ready</p>
             <div className="mt-2 flex items-center gap-2">
               <a href={share(latest)} className="min-w-0 flex-1 truncate text-primary underline">{share(latest)}</a>
               <Button variant="outline" size="icon" aria-label="Copy public link" title="Copy public link" onClick={() => { void navigator.clipboard.writeText(share(latest)); toast.success("Copied"); }}><Copy /></Button>
             </div>
           </div>
         )}

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
                 <Button variant="outline" size="icon" onClick={() => { void navigator.clipboard.writeText(share(m.code)); toast.success("Copied"); }}
                   aria-label="Copy link" title="Copy link"><Copy className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
