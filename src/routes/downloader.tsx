import { createFileRoute } from "@tanstack/react-router";
import { PinterestDownloader } from "@/components/pinterest-downloader";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { trendingPins } from "@/lib/mock-data";

export const Route = createFileRoute("/downloader")({
  head: () => ({
    meta: [
      { title: "Pinterest Downloader — EagerBeaver" },
      { name: "description", content: "Download Pinterest pins, videos, boards, GIFs and stories in original quality. Free, fast, no watermarks." },
      { property: "og:title", content: "Pinterest Downloader — EagerBeaver" },
      { property: "og:description", content: "Download Pinterest pins, videos, boards, GIFs and stories in original quality." },
    ],
  }),
  component: DownloaderPage,
});

function DownloaderPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full blur-3xl opacity-20 animate-float-slow"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="relative mx-auto max-w-4xl px-4 md:px-6 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
            Free forever
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold tracking-tight">
            The <span className="text-gradient">Pinterest downloader</span>
            <br />you actually want to use.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Paste any Pinterest link — pin, board, video, GIF. Get it in original quality.
          </p>

          <div className="mt-10">
            <PinterestDownloader />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        <h2 className="font-display text-2xl font-semibold mb-6">Recently downloaded</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {trendingPins.slice(0, 12).map((p, i) => (
            <div
              key={p.id}
              className="relative aspect-square rounded-xl overflow-hidden shadow-elegant cursor-pointer group animate-fade-up"
              style={{
                background: `linear-gradient(160deg, ${p.color}, ${p.color}88)`,
                animationDelay: `${i * 30}ms`,
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 grid place-items-center">
                <span className="text-xs font-semibold text-white">{p.title}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
