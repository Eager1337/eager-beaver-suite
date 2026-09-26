import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { resolveSocial } from "@/lib/social.functions";
import { proxied } from "@/components/social-downloader";

export const Route = createFileRoute("/v/$code")({
  head: () => ({
    meta: [
      { title: "Watch video — EagerBeaver" },
      { name: "description", content: "A video shared with EagerBeaver, the downloader made for Sierra Leone." },
      { property: "og:title", content: "Watch this video on EagerBeaver" },
      { property: "og:description", content: "Tap to play and download." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Player,
});

function Player() {
  const { code } = Route.useParams();
  const resolve = useServerFn(resolveSocial);
  const q = useQuery({
    queryKey: ["video-link", code],
    queryFn: async () => {
      const { data } = await supabase.from("video_links").select("title, video_url, poster_url, source").eq("code", code).maybeSingle();
      if (!data) return null;
      const r = await resolve({ data: { url: data.video_url } });
      return { link: data, r };
    },
  });

  const r = q.data?.r;
  const video = r?.ok ? r.variants.find((v) => v.kind === "video") : undefined;
  const title = q.data?.link.title ?? "Video";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        {q.isLoading ? (
          <div className="grid place-items-center py-32"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : !q.data ? (
          <div className="text-center py-24">
            <h1 className="font-display text-3xl font-bold">Link not found</h1>
            <Link to="/links" className="mt-4 inline-block text-primary underline">Make a new link</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-muted shadow-elegant">
              {video ? (
                <video src={proxied(video.url, title, true)} poster={q.data.link.poster_url ?? undefined} controls autoPlay playsInline className="w-full max-h-[75vh]" />
              ) : r?.ok && r.embedUrl ? (
                <iframe src={r.embedUrl} title={title} allowFullScreen className="aspect-video w-full" />
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  This video can't play right now. <a href={q.data.link.video_url} className="underline" target="_blank" rel="noreferrer">Open original</a>
                </div>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold">{title}</h1>
            {video && (
              <a href={proxied(video.url, title)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
                <Download className="h-4 w-4" /> Download
              </a>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
