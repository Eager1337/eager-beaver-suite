import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { posts } from "@/lib/blog-posts";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — EagerBeaver" },
      { name: "description", content: "Tips for downloading, captions in Krio and what's trending for Sierra Leone creators." },
      { property: "og:title", content: "Blog — EagerBeaver" },
      { property: "og:description", content: "Tips, guides and trends for Sierra Leone creators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold">Blog</h1>
        <p className="mt-2 text-muted-foreground">Guides and ideas for Salone creators.</p>
        <div className="mt-8 grid gap-4">
          {posts.map((p) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="glass rounded-2xl p-6 transition hover:-translate-y-0.5 hover:shadow-glow">
              <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString(undefined, { dateStyle: "medium" })} · {p.read} read</p>
              <h2 className="mt-1 text-xl font-semibold">{p.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
