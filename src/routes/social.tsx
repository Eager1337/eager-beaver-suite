import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SocialMode } from "@/components/social-downloader";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "YouTube, TikTok & Instagram Downloader (up to 4K) — EagerBeaver" },
      { name: "description", content: "Download YouTube, TikTok, Instagram and web videos in up to 2160p. Free for Sierra Leoneans, no login required." },
      { property: "og:title", content: "YouTube, TikTok & Instagram Downloader — EagerBeaver" },
      { property: "og:description", content: "Save videos in up to 2160p (4K) from YouTube, TikTok, Instagram and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SocialPage,
});

function SocialPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-4xl px-4 md:px-6 pt-16 pb-24">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-gradient">YouTube & Instagram</span> downloader
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Paste a YouTube, TikTok, Instagram or any video link. Pick up to 2160p (4K) and download.
          </p>
        </div>
        <SocialMode />
      </section>
      <SiteFooter />
    </div>
  );
}
