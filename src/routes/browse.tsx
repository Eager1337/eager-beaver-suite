import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download, Heart, X, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse — EagerBeaver" },
      { name: "description", content: "Scroll pictures, GIFs and videos people save on EagerBeaver, then download or save your favourites." },
      { property: "og:title", content: "Browse — EagerBeaver" },
      { property: "og:description", content: "Scroll and download pictures, GIFs and videos saved on EagerBeaver." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrowsePage,
});

type Item = {
  id: string; title: string | null; author_name: string | null; media_type: string;
  media_url: string | null; preview_url: string | null; thumbnail_url: string | null;
  width: number | null; height: number | null;
};

const FILTERS = [
  { key: null, label: "All" },
  { key: "image", label: "Pictures" },
  { key: "video", label: "Videos" },
  { key: "gif", label: "GIFs" },
] as const;

const proxy = (u: string, name: string, inline = false) =>
  `/api/public/media?url=${encodeURIComponent(u)}&filename=${encodeURIComponent(name)}${inline ? "&inline=1" : ""}`;
const isVideo = (i: Item) => i.media_type === "video" || /\.(mp4|webm)(\?|$)/i.test(i.media_url ?? "");

function useSaved() {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("eb-saved-pins") ?? "[]")); } catch { /* ignore */ } }, []);
  const toggle = (id: string) => setSaved((s) => {
    const n = s.includes(id) ? s.filter((x) => x !== id) : [id, ...s];
    localStorage.setItem("eb-saved-pins", JSON.stringify(n));
    return n;
  });
  return { saved, toggle };
}

function BrowsePage() {
  const [type, setType] = useState<string | null>(null);
  const [open, setOpen] = useState<Item | null>(null);
  const { saved, toggle } = useSaved();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["browse", type],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("browse_feed", { _limit: 90, _offset: 0, _type: type ?? undefined });
      if (error) throw error;
      const seen = new Set<string>();
      return ((data ?? []) as Item[]).filter((i) => {
        const k = i.media_url ?? i.id;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-4xl font-bold">Browse</h1>
        <p className="mt-2 text-muted-foreground">Pictures, GIFs and videos people are saving on EagerBeaver.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.label} onClick={() => setType(f.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${type === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isLoading && <div className="mt-10 columns-2 gap-4 md:columns-4">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="mb-4 h-56 animate-pulse rounded-2xl bg-muted" />)}</div>}
        {isError && <p className="mt-10 text-destructive">Couldn't load the feed. Please try again.</p>}
        {data && data.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-lg">Nothing here yet.</p>
            <Link to="/downloader" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-primary-foreground">Download the first one</Link>
          </div>
        )}

        <div className="mt-8 columns-2 gap-4 md:columns-3 lg:columns-4">
          {data?.map((i) => {
            const img = i.thumbnail_url ?? i.preview_url ?? i.media_url!;
            return (
              <div key={i.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-muted">
                <button onClick={() => setOpen(i)} className="block w-full text-left">
                  {isVideo(i) && !i.thumbnail_url && !i.preview_url
                    ? <video src={proxy(i.media_url!, "v", true)} muted loop autoPlay playsInline className="w-full" />
                    : <img src={img} alt={i.title ?? "Saved media"} loading="lazy" className="w-full" onError={(e) => (e.currentTarget.src = proxy(img, "img", true))} />}
                  {isVideo(i) && <Play className="absolute left-3 top-3 h-6 w-6 text-primary-foreground drop-shadow" />}
                </button>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-background/90 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                  <span className="truncate text-xs">{i.title ?? i.author_name ?? ""}</span>
                  <div className="flex gap-1">
                    <button aria-label="Save" onClick={() => toggle(i.id)} className="rounded-full bg-background/80 p-2"><Heart className={`h-4 w-4 ${saved.includes(i.id) ? "fill-primary text-primary" : ""}`} /></button>
                    <a aria-label="Download" href={proxy(i.media_url!, i.title ?? "eagerbeaver")} className="rounded-full bg-primary p-2 text-primary-foreground"><Download className="h-4 w-4" /></a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4" onClick={() => setOpen(null)}>
          <div className="relative max-h-full w-full max-w-3xl overflow-auto rounded-2xl bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Close" onClick={() => setOpen(null)} className="absolute right-3 top-3 z-10 rounded-full bg-muted p-2"><X className="h-4 w-4" /></button>
            {isVideo(open)
              ? <video src={proxy(open.media_url!, "v", true)} controls autoPlay playsInline className="w-full rounded-xl" />
              : <img src={open.media_url!} alt={open.title ?? "Saved media"} className="w-full rounded-xl" />}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{open.title ?? "Untitled"}</p>
                {open.author_name && <p className="text-sm text-muted-foreground">{open.author_name}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(open.id)} className="rounded-full bg-muted px-4 py-2 text-sm">{saved.includes(open.id) ? "Saved" : "Save"}</button>
                <a href={proxy(open.media_url!, open.title ?? "eagerbeaver")} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Download</a>
              </div>
            </div>
          </div>
        </div>
      )}
      <SiteFooter />
    </div>
  );
}
